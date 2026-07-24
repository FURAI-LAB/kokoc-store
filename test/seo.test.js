import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest } from "../src/server.js";
import { buildSitemap } from "../src/lib/sitemap.js";
import {
  canonicalUrl,
  localizedUrl,
  renderSeoHead,
  organizationJsonLd,
  websiteJsonLd,
  breadcrumbJsonLd,
  itemListJsonLd,
  jsonLdScripts,
} from "../src/lib/seo.js";
import { appConfig } from "../src/config/app.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";

// @cloudflare/vitest-pool-workers never populates request.cf (no real Edge in
// the test runner), so getLocaleFromRequest's geo-detection fallback would
// always resolve to "en" here. Every SEO assertion in this file assumes the
// "ru" default unless a test explicitly passes ?lang=en, so req() simulates
// a Russian visitor by default; pass { cf: {...} } to override.
const req = (path, init = {}) =>
  new Request(`https://kokoc.store${path}`, { ...init, cf: { country: "RU", ...init.cf } });

/* Pulls the href of a single <link rel="alternate" hreflang="X" ...> tag */
const hreflangHref = (html, lang) => {
  const match = html.match(
    new RegExp(`hreflang="${lang}"\\s+href="([^"]+)"`)
  );
  return match ? match[1] : null;
};
const canonicalHref = (html) =>
  html.match(/rel="canonical"\s+href="([^"]+)"/)?.[1] ?? null;
const robotsContent = (html) =>
  html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? null;

// ─────────────────────────────────────────────────────────────────────────────
// 1. lib/seo.js — pure unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe("canonicalUrl", () => {
  it("prefixes the domain and keeps a leading-slash path as-is", () => {
    expect(canonicalUrl(appConfig, "/catalog")).toBe("https://kokoc.store/catalog");
  });

  it("adds a leading slash if missing", () => {
    expect(canonicalUrl(appConfig, "catalog")).toBe("https://kokoc.store/catalog");
  });

  it("defaults to the homepage when no path is given", () => {
    expect(canonicalUrl(appConfig)).toBe("https://kokoc.store/");
  });

  it("preserves an explicitly passed query string", () => {
    expect(canonicalUrl(appConfig, "/catalog?tag=new")).toBe(
      "https://kokoc.store/catalog?tag=new"
    );
  });
});

describe("localizedUrl", () => {
  it("returns the bare canonical URL for ru (the default locale)", () => {
    expect(localizedUrl(appConfig, "/catalog", "ru")).toBe(
      "https://kokoc.store/catalog"
    );
  });

  it("appends ?lang=en for en when the path has no query string", () => {
    expect(localizedUrl(appConfig, "/catalog", "en")).toBe(
      "https://kokoc.store/catalog?lang=en"
    );
  });

  it("appends &lang=en for en when the path already has a query string", () => {
    expect(localizedUrl(appConfig, "/catalog?tag=new", "en")).toBe(
      "https://kokoc.store/catalog?tag=new&lang=en"
    );
  });

  it("ru and en never resolve to the same URL", () => {
    const ru = localizedUrl(appConfig, "/about", "ru");
    const en = localizedUrl(appConfig, "/about", "en");
    expect(ru).not.toBe(en);
  });

  it("defaults to ru when no locale is given", () => {
    expect(localizedUrl(appConfig, "/about")).toBe("https://kokoc.store/about");
  });
});

describe("renderSeoHead", () => {
  const base = {
    appConfig,
    title: "Test Title",
    description: "Test description",
    path: "/catalog",
  };

  it("renders an escaped <title> and meta description", () => {
    const html = renderSeoHead({
      ...base,
      title: 'Crocs & Co "Deal"',
      description: "Buy <now>",
    });
    expect(html).toContain("<title>Crocs &amp; Co &quot;Deal&quot;</title>");
    expect(html).toContain('content="Buy &lt;now&gt;"');
  });

  it("self-canonicalizes to this locale's own URL, not the other locale's", () => {
    const ru = renderSeoHead({ ...base, locale: "ru" });
    const en = renderSeoHead({ ...base, locale: "en" });
    expect(canonicalHref(ru)).toBe("https://kokoc.store/catalog");
    expect(canonicalHref(en)).toBe("https://kokoc.store/catalog?lang=en");
  });

  it("defaults to robots: index, follow", () => {
    const html = renderSeoHead(base);
    expect(robotsContent(html)).toBe("index, follow");
  });

  it("emits robots: noindex, follow when noindex is true", () => {
    const html = renderSeoHead({ ...base, noindex: true });
    expect(robotsContent(html)).toBe("noindex, follow");
  });

  it("emits no hreflang tags when alternates is not provided", () => {
    const html = renderSeoHead(base);
    expect(html).not.toContain("hreflang");
  });

  it("emits a distinct, self-consistent hreflang href per locale, plus x-default", () => {
    const html = renderSeoHead({
      ...base,
      locale: "ru",
      alternates: { ru: "/catalog", en: "/catalog" },
    });

    const ruHref = hreflangHref(html, "ru");
    const enHref = hreflangHref(html, "en");
    const defaultHref = hreflangHref(html, "x-default");

    expect(ruHref).toBe("https://kokoc.store/catalog");
    expect(enHref).toBe("https://kokoc.store/catalog?lang=en");
    expect(defaultHref).toBe(ruHref);
    // The whole point of the fix: ru and en must NOT point at the same URL.
    expect(ruHref).not.toBe(enHref);
  });

  it("each hreflang href matches that locale's own canonical when rendered standalone", () => {
    // i.e. the en page's <link rel="canonical"> must equal the href the ru
    // page's hreflang="en" tag points to — otherwise the signals conflict.
    const ruPage = renderSeoHead({
      ...base,
      locale: "ru",
      alternates: { ru: "/catalog", en: "/catalog" },
    });
    const enPage = renderSeoHead({
      ...base,
      locale: "en",
      alternates: { ru: "/catalog", en: "/catalog" },
    });

    expect(hreflangHref(ruPage, "en")).toBe(canonicalHref(enPage));
    expect(hreflangHref(enPage, "ru")).toBe(canonicalHref(ruPage));
  });

  it("falls back to /favbig.jpg for og:image when no image is given", () => {
    const html = renderSeoHead(base);
    expect(html).toContain('property="og:image" content="https://kokoc.store/favbig.jpg"');
  });

  it("resolves a root-relative image against the domain", () => {
    const html = renderSeoHead({ ...base, image: "/crops/product-coke.png" });
    expect(html).toContain(
      'property="og:image" content="https://kokoc.store/crops/product-coke.png"'
    );
  });

  it("keeps an already-absolute image URL untouched", () => {
    const html = renderSeoHead({ ...base, image: "https://cdn.example.com/x.png" });
    expect(html).toContain('property="og:image" content="https://cdn.example.com/x.png"');
  });

  it("sets og:locale based on the locale", () => {
    expect(renderSeoHead({ ...base, locale: "ru" })).toContain(
      'property="og:locale" content="ru_RU"'
    );
    expect(renderSeoHead({ ...base, locale: "en" })).toContain(
      'property="og:locale" content="en_US"'
    );
  });

  it("uses the requested og:type (defaults to website)", () => {
    expect(renderSeoHead(base)).toContain('property="og:type" content="website"');
    expect(renderSeoHead({ ...base, type: "product" })).toContain(
      'property="og:type" content="product"'
    );
  });

  it("og:url always matches this locale's own canonical URL", () => {
    const html = renderSeoHead({ ...base, locale: "en" });
    const ogUrl = html.match(/property="og:url" content="([^"]+)"/)[1];
    expect(ogUrl).toBe(canonicalHref(html));
  });
});

describe("JSON-LD builders", () => {
  it("organizationJsonLd has the expected shape", () => {
    const ld = organizationJsonLd(appConfig);
    expect(ld["@type"]).toBe("Organization");
    expect(ld.url).toBe("https://kokoc.store/");
  });

  it("websiteJsonLd includes a SearchAction targeting /catalog", () => {
    const ld = websiteJsonLd(appConfig);
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.potentialAction["@type"]).toBe("SearchAction");
    expect(ld.potentialAction.target).toContain("/catalog?q={search_term_string}");
  });

  it("breadcrumbJsonLd numbers items starting at 1 and resolves absolute URLs", () => {
    const ld = breadcrumbJsonLd(appConfig, [
      { name: "Home", path: "/" },
      { name: "Catalog", path: "/catalog" },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement[0]).toMatchObject({ position: 1, name: "Home", item: "https://kokoc.store/" });
    expect(ld.itemListElement[1]).toMatchObject({ position: 2, name: "Catalog", item: "https://kokoc.store/catalog" });
  });

  it("itemListJsonLd builds product URLs by slug", () => {
    const ld = itemListJsonLd(appConfig, [{ slug: "classic-clog" }], "/catalog");
    expect(ld.itemListElement[0].url).toBe("https://kokoc.store/product/classic-clog");
  });

  it("jsonLdScripts serializes one <script> per object and skips falsy entries", () => {
    const out = jsonLdScripts(null, { "@type": "A" }, null, { "@type": "B" });
    expect(out.match(/<script type="application\/ld\+json">/g)).toHaveLength(2);
    expect(out).toContain('"@type":"A"');
    expect(out).toContain('"@type":"B"');
  });

  it("jsonLdScripts embeds the nonce attribute on every tag when provided", () => {
    const out = jsonLdScripts("abc123", { "@type": "A" }, { "@type": "B" });
    expect(out.match(/nonce="abc123"/g)).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. lib/sitemap.js
// ─────────────────────────────────────────────────────────────────────────────

describe("buildSitemap", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("is well-formed XML with the sitemap + xhtml namespaces", async () => {
    const xml = await buildSitemap(appConfig, makeEnv());
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it("includes every static page", async () => {
    const xml = await buildSitemap(appConfig, makeEnv());
    for (const path of ["/", "/catalog", "/crocs", "/adidas", "/collabs", "/delivery", "/about"]) {
      expect(xml).toContain(`<loc>${`https://kokoc.store${path}`.replace(/\/$/, path === "/" ? "/" : "")}</loc>`);
    }
  });

  it("gives every <url> an ru/en/x-default hreflang annotation, with en = ru + ?lang=en", async () => {
    const xml = await buildSitemap(appConfig, makeEnv());
    const blocks = xml.match(/<url>[\s\S]*?<\/url>/g);
    expect(blocks.length).toBeGreaterThan(0);

    for (const block of blocks) {
      const loc = block.match(/<loc>([^<]+)<\/loc>/)[1];
      const ru = hreflangHref(block, "ru");
      const en = hreflangHref(block, "en");
      const xDefault = hreflangHref(block, "x-default");

      expect(ru).toBe(loc);
      expect(en).toBe(`${loc}?lang=en`);
      expect(xDefault).toBe(ru);
    }
  });

  it("includes active product slugs", async () => {
    const xml = await buildSitemap(appConfig, makeEnv());
    expect(xml).toContain("<loc>https://kokoc.store/product/classic-clog</loc>");
    expect(xml).toContain("<loc>https://kokoc.store/product/platform-clog</loc>");
  });

  it("excludes draft/hidden products", async () => {
    const xml = await buildSitemap(appConfig, makeEnv());
    expect(xml).not.toContain("hidden-clog");
  });

  it("still returns the static pages if the product query fails (D1 unreachable)", async () => {
    const brokenEnv = {
      DB: {
        prepare() {
          throw new Error("D1 unreachable");
        },
      },
    };
    const xml = await buildSitemap(appConfig, brokenEnv);
    expect(xml).toContain("<loc>https://kokoc.store/catalog</loc>");
    expect(xml).not.toContain("/product/");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Live pages via handleRequest — canonical / hreflang / robots / h1 / copy
// ─────────────────────────────────────────────────────────────────────────────

describe("/ (landing) SEO", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("has exactly one <h1>, mentioning Adidas Originals", async () => {
    const res = await handleRequest(req("/"), makeEnv(), {});
    const html = await res.text();
    expect((html.match(/<h1/g) || []).length).toBe(1);
    expect(html).toMatch(/<h1[^>]*>[^<]*Adidas Originals[^<]*<\/h1>/);
  });

  it("self-canonicalizes per locale and exposes a real, distinct en URL via hreflang", async () => {
    const ruRes = await handleRequest(req("/"), makeEnv(), {});
    const ruHtml = await ruRes.text();
    expect(canonicalHref(ruHtml)).toBe("https://kokoc.store/");
    expect(hreflangHref(ruHtml, "en")).toBe("https://kokoc.store/?lang=en");

    const enRes = await handleRequest(req("/?lang=en"), makeEnv(), {});
    const enHtml = await enRes.text();
    expect(canonicalHref(enHtml)).toBe("https://kokoc.store/?lang=en");
    expect(hreflangHref(enHtml, "ru")).toBe("https://kokoc.store/");
  });

  it("<title> mentions Adidas Originals (ru and en)", async () => {
    const ruHtml = await (await handleRequest(req("/"), makeEnv(), {})).text();
    const enHtml = await (await handleRequest(req("/?lang=en"), makeEnv(), {})).text();
    expect(ruHtml).toMatch(/<title>[^<]*Adidas Originals[^<]*<\/title>/);
    expect(enHtml).toMatch(/<title>[^<]*Adidas Originals[^<]*<\/title>/);
  });

  it("is indexable by default", async () => {
    const html = await (await handleRequest(req("/"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("index, follow");
  });

  it("includes Organization and WebSite JSON-LD", async () => {
    const html = await (await handleRequest(req("/"), makeEnv(), {})).text();
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('"@type":"WebSite"');
  });
});

describe("/catalog SEO", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("plain /catalog is indexable and self-canonical", async () => {
    const html = await (await handleRequest(req("/catalog"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("index, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/catalog");
  });

  it("title mentions Adidas Originals even though /catalog isn't brand-specific", async () => {
    const html = await (await handleRequest(req("/catalog"), makeEnv(), {})).text();
    expect(html).toMatch(/<title>[^<]*Adidas Originals[^<]*<\/title>/);
  });

  it("a tag filter is indexable AND self-canonicalizes to its own filtered URL", async () => {
    const html = await (await handleRequest(req("/catalog?tag=classic"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("index, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/catalog?tag=classic");
  });

  it("a search query is noindex, and canonicalizes back to the bare /catalog", async () => {
    const html = await (await handleRequest(req("/catalog?q=clog"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("noindex, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/catalog");
  });

  it("page 2+ is noindex, and canonicalizes back to the bare /catalog", async () => {
    const html = await (await handleRequest(req("/catalog?offset=12"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("noindex, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/catalog");
  });

  it("a search query combined with a tag filter still canonicalizes to the bare page (no contradictory filter+noindex canonical)", async () => {
    const html = await (await handleRequest(req("/catalog?tag=classic&q=clog"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("noindex, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/catalog");
  });

  it("exposes a real distinct en URL via hreflang", async () => {
    const html = await (await handleRequest(req("/catalog"), makeEnv(), {})).text();
    expect(hreflangHref(html, "en")).toBe("https://kokoc.store/catalog?lang=en");
  });
});

describe("/crocs SEO", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("is indexable and self-canonical by default", async () => {
    const html = await (await handleRequest(req("/crocs"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("index, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/crocs");
  });

  it("has exactly one <h1>, mentioning Crocs", async () => {
    const html = await (await handleRequest(req("/crocs"), makeEnv(), {})).text();
    expect((html.match(/<h1/g) || []).length).toBe(1);
    expect(html).toMatch(/<h1[^>]*>[^<]*Crocs[^<]*<\/h1>/);
  });

  it("title and description mention купить/buy", async () => {
    const html = await (await handleRequest(req("/crocs"), makeEnv(), {})).text();
    expect(html).toMatch(/<title>[^<]*Купить Crocs[^<]*<\/title>/);
    const desc = html.match(/<meta name="description" content="([^"]+)"/)[1];
    expect(desc).toContain("Купить");
  });

  it("a tag filter is indexable and self-canonicalizes to its own filtered URL", async () => {
    const html = await (await handleRequest(req("/crocs?tag=new"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("index, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/crocs?tag=new");
  });

  it("page 2+ is noindex and canonicalizes back to the bare /crocs", async () => {
    const html = await (await handleRequest(req("/crocs?offset=12"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("noindex, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/crocs");
  });

  it("includes FAQPage JSON-LD on the bare page", async () => {
    const html = await (await handleRequest(req("/crocs"), makeEnv(), {})).text();
    expect(html).toContain('"@type":"FAQPage"');
  });

  it("omits FAQPage JSON-LD on filtered/paginated/search views", async () => {
    const html = await (await handleRequest(req("/crocs?offset=12"), makeEnv(), {})).text();
    expect(html).not.toContain('"@type":"FAQPage"');
  });

  it("includes BreadcrumbList JSON-LD", async () => {
    const html = await (await handleRequest(req("/crocs"), makeEnv(), {})).text();
    expect(html).toContain('"@type":"BreadcrumbList"');
  });
});

describe("/catalog?brand=crocs legacy redirect", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("301-redirects to /crocs", async () => {
    const res = await handleRequest(req("/catalog?brand=crocs"), makeEnv(), {});
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://kokoc.store/crocs");
  });

  it("preserves other query params (e.g. tag) while dropping brand", async () => {
    const res = await handleRequest(req("/catalog?brand=crocs&tag=new"), makeEnv(), {});
    expect(res.status).toBe(301);
    const location = new URL(res.headers.get("location"));
    expect(location.pathname).toBe("/crocs");
    expect(location.searchParams.get("tag")).toBe("new");
    expect(location.searchParams.has("brand")).toBe(false);
  });

  it("is case-insensitive on the brand value", async () => {
    const res = await handleRequest(req("/catalog?brand=Crocs"), makeEnv(), {});
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://kokoc.store/crocs");
  });
});

describe("/adidas SEO", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("is indexable and self-canonical by default", async () => {
    const html = await (await handleRequest(req("/adidas"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("index, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/adidas");
  });

  it("title mentions Adidas Originals", async () => {
    const html = await (await handleRequest(req("/adidas"), makeEnv(), {})).text();
    expect(html).toMatch(/<title>[^<]*Adidas Originals[^<]*<\/title>/);
  });

  it("a tag filter is indexable and self-canonicalizes to its own filtered URL", async () => {
    const html = await (await handleRequest(req("/adidas?tag=new"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("index, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/adidas?tag=new");
  });

  it("page 2+ is noindex and canonicalizes back to the bare /adidas", async () => {
    const html = await (await handleRequest(req("/adidas?offset=12"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("noindex, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/adidas");
  });
});

describe("/product/:slug SEO", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("is indexable, self-canonical, and exposes hreflang for both locales", async () => {
    const html = await (await handleRequest(req("/product/classic-clog"), makeEnv(), {})).text();
    expect(robotsContent(html)).toBe("index, follow");
    expect(canonicalHref(html)).toBe("https://kokoc.store/product/classic-clog");
    expect(hreflangHref(html, "ru")).toBe("https://kokoc.store/product/classic-clog");
    expect(hreflangHref(html, "en")).toBe("https://kokoc.store/product/classic-clog?lang=en");
  });

  it("uses og:type product", async () => {
    const html = await (await handleRequest(req("/product/classic-clog"), makeEnv(), {})).text();
    expect(html).toContain('property="og:type" content="product"');
  });

  it("renders the title and description exactly once-escaped (no double-escaping regression)", async () => {
    const html = await (await handleRequest(req("/product/classic-clog"), makeEnv(), {})).text();
    expect(html).toContain("<title>Classic Clog — Kokoc Store</title>");
    expect(html).not.toMatch(/&amp;(amp|lt|gt|quot|#39);/);
  });

  it("includes Product JSON-LD with an offer", async () => {
    const html = await (await handleRequest(req("/product/classic-clog"), makeEnv(), {})).text();
    expect(html).toContain('"@type":"Product"');
    expect(html).toMatch(/"@type":"(Offer|AggregateOffer)"/);
  });

  it("includes BreadcrumbList JSON-LD", async () => {
    const html = await (await handleRequest(req("/product/classic-clog"), makeEnv(), {})).text();
    expect(html).toContain('"@type":"BreadcrumbList"');
  });
});

describe("static pages mention Adidas Originals where the store-wide brand mix matters", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("/about description mentions Adidas Originals", async () => {
    const html = await (await handleRequest(req("/about"), makeEnv(), {})).text();
    const desc = html.match(/<meta name="description" content="([^"]+)"/)[1];
    expect(desc).toContain("Adidas Originals");
  });

  it("/delivery description mentions Adidas Originals", async () => {
    const html = await (await handleRequest(req("/delivery"), makeEnv(), {})).text();
    const desc = html.match(/<meta name="description" content="([^"]+)"/)[1];
    expect(desc).toContain("Adidas Originals");
  });

  it("/collabs description mentions Adidas Originals", async () => {
    const html = await (await handleRequest(req("/collabs"), makeEnv(), {})).text();
    const desc = html.match(/<meta name="description" content="([^"]+)"/)[1];
    expect(desc).toContain("Adidas Originals");
  });

  it("matches in English too", async () => {
    const html = await (await handleRequest(req("/about?lang=en"), makeEnv(), {})).text();
    const desc = html.match(/<meta name="description" content="([^"]+)"/)[1];
    expect(desc).toContain("Adidas Originals");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. robots.txt / sitemap.xml route
// ─────────────────────────────────────────────────────────────────────────────

describe("/sitemap.xml route", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("returns XML with the right content-type", async () => {
    const res = await handleRequest(req("/sitemap.xml"), makeEnv(), {});
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
  });

  it("body matches buildSitemap output for the same env", async () => {
    const res = await handleRequest(req("/sitemap.xml"), makeEnv(), {});
    const body = await res.text();
    expect(body).toContain("<loc>https://kokoc.store/product/classic-clog</loc>");
    expect(body).toContain('hreflang="en"');
  });
});

describe("/robots.txt route", () => {
  it("returns plain text with the right content-type", async () => {
    const res = await handleRequest(req("/robots.txt"), makeEnv(), {});
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });

  it("allows all crawlers and points to the sitemap", async () => {
    const res = await handleRequest(req("/robots.txt"), makeEnv(), {});
    const body = await res.text();
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Disallow:");
    expect(body).toContain("Sitemap: https://kokoc.store/sitemap.xml");
  });
});
