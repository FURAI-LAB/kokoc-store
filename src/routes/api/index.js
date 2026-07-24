import { jsonResponse, methodNotAllowedResponse, notFoundResponse } from "../../lib/response.js";
import { handleSubscribe } from "./subscribe.js";
import { getCatalogPage, getProductDetail } from "../../lib/catalog.js";
import { handleCartRequest } from "./cart.js";
import { getApprovedReviews, submitReview } from "../../lib/reviews.js";
import { handleCreateOrder } from "./orders.js";
import { handleMinigameRequest } from "./minigame.js";
import { rateLimit } from "../../lib/ratelimit.js";

async function hashIp(ip) {
  if (!ip) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function buildBindingStatus(env) {
  return {
    assets:   Boolean(env.ASSETS),
    database: Boolean(env.DB),
    cache:    Boolean(env.KV),
  };
}

function handleHealth(request, env, appConfig) {
  if (request.method !== "GET") return methodNotAllowedResponse(["GET"]);
  return jsonResponse({
    ok: true,
    service: appConfig.serviceName,
    domain:  appConfig.domain,
    version: appConfig.apiVersion,
    storeStatus: appConfig.storeStatus,
    timestamp: new Date().toISOString(),
    bindings: buildBindingStatus(env),
  });
}

/**
 * GET /api/catalog/products
 * Query params: sort, tag, limit (max 48), offset
 */
async function handleCatalogProducts(request, env) {
  if (request.method !== "GET") return methodNotAllowedResponse(["GET"]);

  const url    = new URL(request.url);
  const sort   = ["newest", "price_asc", "price_desc"]
    .includes(url.searchParams.get("sort"))
    ? url.searchParams.get("sort")
    : "newest";
  const tag    = url.searchParams.get("tag") || null;
  const limit  = Math.min(48, Math.max(1, parseInt(url.searchParams.get("limit") || "12", 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

  if (!env.DB) {
    return jsonResponse({
      ok: true,
      products: [],
      pagination: { total: 0, limit, offset },
      message: "DB not bound yet.",
    });
  }

  const data = await getCatalogPage(env, { limit, offset, sort, tag });
  return jsonResponse({
    ok: true,
    ...data,
    pagination: { total: data.total, limit, offset },
  });
}

/**
 * GET /api/catalog/products/:slug
 * Returns full product detail including variants (with crocs_size) and images.
 * Used by the quick-view modal on /catalog.
 */
async function handleProductDetail(request, env, slug) {
  if (request.method !== "GET") return methodNotAllowedResponse(["GET"]);

  if (!env.DB) {
    return jsonResponse({ ok: false, error: "DB not bound" }, { status: 503 });
  }

  const product = await getProductDetail(env, slug);
  if (!product) {
    return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });
  }

  return jsonResponse({ ok: true, product });
}

/**
 * GET  /api/products/:slug/reviews — approved reviews + rating summary
 * POST /api/products/:slug/reviews — submit a new review (goes to 'pending')
 *   body: { authorName, rating (1-5), title?, body }
 */
async function handleProductReviews(request, env, slug) {
  if (!env.DB) {
    return jsonResponse({ ok: false, error: "DB not bound" }, { status: 503 });
  }

  const product = await env.DB.prepare(
    `SELECT id, rating_avg, rating_count FROM products WHERE slug = ? AND status = 'active'`
  ).bind(slug).first();

  if (!product) {
    return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (request.method === "GET") {
    const reviews = await getApprovedReviews(env, product.id);
    return jsonResponse({
      ok: true,
      ratingAvg: product.rating_avg ?? null,
      ratingCount: product.rating_count || 0,
      reviews,
    });
  }

  if (request.method === "POST") {
    /* Rate limit: 3 reviews per IP per hour */
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const ipHash = await hashIp(ip);
    const allowed = await rateLimit(env.KV, "review", ipHash, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!allowed) {
      return jsonResponse(
        { ok: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const authorName = String(payload?.authorName || "").trim();
    const rating = Number(payload?.rating);
    const body = String(payload?.body || "").trim();
    const title = payload?.title ? String(payload.title).trim().slice(0, 120) : null;

    if (!authorName || authorName.length > 80) {
      return jsonResponse({ ok: false, error: "authorName is required (max 80 chars)" }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return jsonResponse({ ok: false, error: "rating must be an integer 1-5" }, { status: 400 });
    }
    if (!body || body.length > 2000) {
      return jsonResponse({ ok: false, error: "body is required (max 2000 chars)" }, { status: 400 });
    }

    const result = await submitReview(env, product.id, { authorName, rating, title, body });
    return jsonResponse({
      ok: true,
      review: result,
      message: "Thanks! Your review will appear once it's been approved.",
    }, { status: 201 });
  }

  return methodNotAllowedResponse(["GET", "POST"]);
}

export async function handleApiRequest(request, env, appConfig, ctx) {
  const url = new URL(request.url);

  if (url.pathname === "/api/health") {
    return handleHealth(request, env, appConfig);
  }

  // Catalog list
  if (url.pathname === "/api/catalog/products") {
    return handleCatalogProducts(request, env);
  }

  // Product detail by slug (used by quick-view)
  const detailMatch = url.pathname.match(/^\/api\/catalog\/products\/([^/]+)$/);
  if (detailMatch) {
    return handleProductDetail(request, env, decodeURIComponent(detailMatch[1]));
  }

  // Cart routes
  if (url.pathname.startsWith("/api/cart")) {
    return handleCartRequest(request, env);
  }

  // Product reviews
  const reviewsMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/reviews$/);
  if (reviewsMatch) {
    return handleProductReviews(request, env, decodeURIComponent(reviewsMatch[1]));
  }

  if (url.pathname === "/api/subscribe") {
    return handleSubscribe(request, env, ctx);
  }

  if (url.pathname === "/api/orders") {
    return handleCreateOrder(request, env);
  }

  if (url.pathname.startsWith("/api/minigame/")) {
    return handleMinigameRequest(request, env);
  }

  return notFoundResponse({ message: "API route not found", pathname: url.pathname });
}
