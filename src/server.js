import { appConfig } from "./config/app.js";
import { getActiveProducts } from "./lib/products.js";
import { getCatalogPage, getProductDetail } from "./lib/catalog.js";
import { htmlResponse, htmlOrMarkdownResponse, xmlResponse, textResponse } from "./lib/response.js";
import { buildSitemap } from "./lib/sitemap.js";
import { withSecurityHeaders, withAgentDiscoveryHeaders, generateNonce } from "./lib/security.js";
import { sanitizeR2Key } from "./lib/uploads.js";

/** Content-types the R2 proxy is willing to serve as-is. Anything else
 *  (including legacy objects stored before upload validation existed) is
 *  downgraded to an inert attachment. */
const SAFE_IMAGE_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif"
]);
import { getLocaleFromRequest, localeHeaders } from "./lib/i18n.js";
import { renderLandingPage } from "./pages/landing.js";
import { renderCatalogPage } from "./pages/catalog.js";
import { renderAdidasPage } from "./pages/adidas.js";
import { renderCrocsPage } from "./pages/crocs.js";
import { renderCollabsPage } from "./pages/collabs.js";
import { renderCollabDetailPage } from "./pages/collabs-detail.js";
import { getCollabsFromKV, getCollabProductCounts, getCollabDetail } from "./lib/collabs.js";
import { renderProductPage } from "./pages/product.js";
import { renderDeliveryPage } from "./pages/delivery.js";
import { renderAboutPage } from "./pages/about.js";
import { handleApiRequest } from "./routes/api/index.js";
import { handleAdminRequest } from "./routes/admin/index.js";
import { renderMinigamePage } from "./pages/minigame.js";
import { renderNotFoundPage } from "./pages/not-found.js";

export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  let response;

  try {
    response = await handleRequestInternal(request, env, ctx);
  } catch (err) {
    // An unhandled exception anywhere in handleRequestInternal (D1 hiccup,
    // KV timeout, bad product data, etc.) used to bubble up as Cloudflare's
    // bare unhandled-error response — a real 5xx with no cache-control, no
    // HTML body, and no logging. That's exactly what Search Console flags
    // under "Server error (5xx)". Catch it here so crawlers/users get a
    // deliberate, cacheable-safe 500 response and we get a log line to debug.
    console.error("handleRequest: unhandled error", err);
    return withSecurityHeaders(
      textResponse("Internal server error. Please try again shortly.", {
        status: 500,
        headers: { "cache-control": "no-store" }
      })
    );
  }

  // Skip agent-discovery Link headers on admin/API responses — they're not
  // content agents should be crawling/citing, and admin already sets its
  // own strict cache-control/CSP.
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/")) {
    return response;
  }

  return withAgentDiscoveryHeaders(response, appConfig);
}

async function handleRequestInternal(request, env, ctx) {
  const url = new URL(request.url);

  // ── www → apex redirect ─────────────────────────────────────────────────────
  // Canonical host everywhere in SEO metadata is the bare apex (appConfig.domain).
  // www.kokoc.store was reachable but unrouted, returning 5xx to crawlers/users —
  // route it explicitly and 301 it to the canonical host instead of serving a
  // duplicate copy of the whole site under a second hostname.
  if (url.hostname === `www.${appConfig.domain}`) {
    url.hostname = appConfig.domain;
    return Response.redirect(url.toString(), 301);
  }

  const locale = getLocaleFromRequest(request);
  const localizedHeaders = localeHeaders(locale);
  // Per-request CSP nonce — passed to every renderXPage() call so its
  // inline <script nonce="..."> matches the Content-Security-Policy
  // header withSecurityHeaders() sets below. Generated once here so
  // the same value is used consistently for a given response.
  const nonce = generateNonce();

  // WhatsApp number is used by the cart checkout modal on every page, so it's
  // fetched once here rather than per-page.
  const whatsappNumber = env.KV
    ? await env.KV.get("settings:whatsapp_number").catch(() => "")
    : "";

  // ── Admin (all /admin/* routes) ────────────────────────────────────────────
  if (url.pathname.startsWith("/admin")) {
    return withSecurityHeaders(await handleAdminRequest(request, env), {
      "cache-control": "no-store",
      "content-security-policy": [
        "default-src 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data: blob:",
        "object-src 'none'",
        "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
        "style-src 'self' 'unsafe-inline'",
        "upgrade-insecure-requests"
      ].join("; ")
    });
  }

  // ── Landing page ───────────────────────────────────────────────────────────
  if (url.pathname === "/") {
    const products = await getActiveProducts(env);
    return withSecurityHeaders(
      await htmlOrMarkdownResponse(renderLandingPage(appConfig, products, locale.locale, whatsappNumber || "", nonce), request, {
        headers: {
          ...localizedHeaders,
          "cache-control": "public, max-age=60, stale-while-revalidate=300"
        }
      }),
      {},
      nonce
    );
  }

  // ── Catalog page ───────────────────────────────────────────────────────────
  if (url.pathname === "/catalog") {
    const brandParam = url.searchParams.get("brand") || null;

    // /crocs is now the dedicated, indexable landing page for Crocs — permanently
    // redirect the old query-param view there instead of serving duplicate
    // content under two URLs (keeps any existing inbound links/SEO value).
    if (brandParam && brandParam.toLowerCase() === "crocs") {
      const redirectUrl = new URL("/crocs", request.url);
      for (const [key, value] of url.searchParams) {
        if (key === "brand") continue;
        redirectUrl.searchParams.set(key, value);
      }
      return Response.redirect(redirectUrl.toString(), 301);
    }

    const limit  = 12;
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
    const sort   = ["newest", "price_asc", "price_desc"]
      .includes(url.searchParams.get("sort"))
      ? url.searchParams.get("sort")
      : "newest";
    const tag = url.searchParams.get("tag") || null;
    const q   = url.searchParams.get("q")   || null;
    const brand = brandParam;

    const data = await getCatalogPage(env, { limit, offset, sort, tag, q, brand });

    return withSecurityHeaders(
      await htmlOrMarkdownResponse(renderCatalogPage(appConfig, { ...data, limit, offset, sort, tag, q, brand: brandParam }, locale.locale, whatsappNumber || "", nonce), request, {
        headers: {
          ...localizedHeaders,
          "cache-control": "public, max-age=30, stale-while-revalidate=120"
        }
      }),
      {},
      nonce
    );
  }

  // ── Crocs page ──────────────────────────────────────────────────────────────
  if (url.pathname === "/crocs") {
    const limit  = 12;
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
    const sort   = ["newest", "price_asc", "price_desc"]
      .includes(url.searchParams.get("sort"))
      ? url.searchParams.get("sort")
      : "newest";
    const tag = url.searchParams.get("tag") || null;
    const q   = url.searchParams.get("q")   || null;

    const data = await getCatalogPage(env, { limit, offset, sort, tag, q, brand: "Crocs" });

    return withSecurityHeaders(
      await htmlOrMarkdownResponse(renderCrocsPage(appConfig, { ...data, limit, offset, sort, tag, q }, locale.locale, whatsappNumber || "", nonce), request, {
        headers: {
          ...localizedHeaders,
          "cache-control": "public, max-age=30, stale-while-revalidate=120"
        }
      }),
      {},
      nonce
    );
  }

  // ── Adidas Originals page ──────────────────────────────────────────────────
  if (url.pathname === "/adidas") {
    const limit  = 12;
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
    const sort   = ["newest", "price_asc", "price_desc"]
      .includes(url.searchParams.get("sort"))
      ? url.searchParams.get("sort")
      : "newest";
    const tag = url.searchParams.get("tag") || null;
    const q   = url.searchParams.get("q")   || null;

    const data = await getCatalogPage(env, { limit, offset, sort, tag, q, brand: "Adidas Originals" });

    return withSecurityHeaders(
      await htmlOrMarkdownResponse(renderAdidasPage(appConfig, { ...data, limit, offset, sort, tag, q }, locale.locale, whatsappNumber || "", nonce), request, {
        headers: {
          ...localizedHeaders,
          "cache-control": "public, max-age=30, stale-while-revalidate=120"
        }
      }),
      {},
      nonce
    );
  }

  // ── Product page ───────────────────────────────────────────────────────────
  if (url.pathname.startsWith("/product/")) {
    const slug = decodeURIComponent(url.pathname.slice("/product/".length).split("?")[0]);
    if (!slug) return Response.redirect(new URL("/catalog", request.url).toString(), 302);

    const product = await getProductDetail(env, slug);

    if (!product) {
      return withSecurityHeaders(
        htmlResponse(renderNotFoundPage(appConfig, locale.locale, whatsappNumber || "", nonce), {
          status: 404,
          headers: {
            ...localizedHeaders,
            "cache-control": "no-store"
          }
        }),
        {},
        nonce
      );
    }

    return withSecurityHeaders(
      await htmlOrMarkdownResponse(renderProductPage(appConfig, product, locale.locale, whatsappNumber || "", nonce), request, {
        headers: {
          ...localizedHeaders,
          "cache-control": "public, max-age=60, stale-while-revalidate=300"
        }
      }),
      {},
      nonce
    );
  }

  // ── Delivery page ──────────────────────────────────────────────────────────
  if (url.pathname === "/delivery") {
    return withSecurityHeaders(
      await htmlOrMarkdownResponse(renderDeliveryPage(appConfig, locale.locale, whatsappNumber || "", nonce), request, {
        headers: {
          ...localizedHeaders,
          "cache-control": "public, max-age=300, stale-while-revalidate=3600"
        }
      }),
      {},
      nonce
    );
  }

  // ── About page ────────────────────────────────────────────────────────────────
  if (url.pathname === "/about") {
    return withSecurityHeaders(
      await htmlOrMarkdownResponse(renderAboutPage(appConfig, locale.locale, whatsappNumber || "", nonce), request, {
        headers: {
          ...localizedHeaders,
          "cache-control": "public, max-age=300, stale-while-revalidate=3600"
        }
      }),
      {},
      nonce
    );
  }

  // ── Collabs page ───────────────────────────────────────────────────────────
  if (url.pathname === "/collabs") {
    const collabs = await getCollabsFromKV(env, { status: "active" });
    const productCounts = await getCollabProductCounts(env, collabs);
    return withSecurityHeaders(
      await htmlOrMarkdownResponse(renderCollabsPage(appConfig, collabs, locale.locale, whatsappNumber || "", productCounts, nonce), request, {
        headers: {
          ...localizedHeaders,
          "cache-control": "public, max-age=300, stale-while-revalidate=3600"
        }
      }),
      {},
      nonce
    );
  }

  // ── Single collab page ───────────────────────────────────────────────────────
  if (url.pathname.startsWith("/collabs/")) {
    const slug = url.pathname.slice("/collabs/".length).replace(/\/$/, "");
    const detail = slug ? await getCollabDetail(env, slug, { getCatalogPage }) : null;

    if (!detail) {
      return withSecurityHeaders(
        htmlResponse(renderNotFoundPage(appConfig, locale.locale, whatsappNumber || "", nonce), {
          status: 404,
          headers: localizedHeaders
        }),
        {},
        nonce
      );
    }

    return withSecurityHeaders(
      await htmlOrMarkdownResponse(renderCollabDetailPage(appConfig, detail, locale.locale, whatsappNumber || "", nonce), request, {
        headers: {
          ...localizedHeaders,
          "cache-control": "public, max-age=300, stale-while-revalidate=3600"
        }
      }),
      {},
      nonce
    );
  }

  // ── Minigame page ──────────────────────────────────────────────────────────
  if (url.pathname === "/minigame") {
    return withSecurityHeaders(
      htmlResponse(renderMinigamePage(appConfig, locale.locale, whatsappNumber || "", nonce), {
        headers: {
          ...localizedHeaders,
          "cache-control": "public, max-age=300, stale-while-revalidate=3600"
        }
      }),
      {},
      nonce
    );
  }

  // ── robots.txt ──────────────────────────────────────────────────────────────
  if (url.pathname === "/robots.txt") {
    const body = [
      "User-agent: *",
      "Disallow:",
      "",
      `Sitemap: https://${appConfig.domain}/sitemap.xml`,
      ""
    ].join("\n");
    return withSecurityHeaders(
      textResponse(body, {
        headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" }
      })
    );
  }

  // ── sitemap.xml ─────────────────────────────────────────────────────────────
  if (url.pathname === "/sitemap.xml") {
    const xml = await buildSitemap(appConfig, env);
    return withSecurityHeaders(
      xmlResponse(xml, {
        headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" }
      })
    );
  }

  // ── API routes ─────────────────────────────────────────────────────────────
  if (url.pathname.startsWith("/api/")) {
    return withSecurityHeaders(
      await handleApiRequest(request, env, appConfig, ctx),
      { "cache-control": "no-store" }
    );
  }

  // ── R2 image proxy ─────────────────────────────────────────────────────────
  if ((url.pathname.startsWith("/r2/") || url.pathname.startsWith("/cdn/")) && env.PRODUCT_IMAGES) {
    const rawKey = url.pathname.startsWith("/cdn/") ? url.pathname.slice(5) : url.pathname.slice(4);
    const r2Key = sanitizeR2Key(rawKey);
    if (!r2Key) return new Response("Not found", { status: 404 });

    const object = await env.PRODUCT_IMAGES.get(r2Key);
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);

    // Objects uploaded BEFORE the upload allow-list existed may still carry
    // a dangerous stored content-type (text/html, image/svg+xml, ...).
    // writeHttpMetadata() replays it verbatim, so re-assert a safe value
    // here rather than trusting what is already sitting in the bucket.
    const stored = (headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
    if (!SAFE_IMAGE_CONTENT_TYPES.has(stored)) {
      headers.set("content-type", "application/octet-stream");
      headers.set("content-disposition", "attachment");
    }

    // This branch returns a bare Response (not withSecurityHeaders), so the
    // sniffing guard has to be set explicitly — without it a browser can
    // ignore the declared type and execute the body.
    headers.set("x-content-type-options", "nosniff");
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(object.body, { headers });
  }

  // ── Static assets ──────────────────────────────────────────────────────────
  if (request.method === "GET" || request.method === "HEAD") {
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return withSecurityHeaders(assetResponse);
  }

  return withSecurityHeaders(
    htmlResponse(renderNotFoundPage(appConfig, locale.locale, whatsappNumber || "", nonce), {
      status: 404,
      headers: {
        ...localizedHeaders,
        "cache-control": "no-store"
      }
    }),
    {},
    nonce
  );
}