/**
 * sitemap.js — Builds sitemap.xml for kokoc.store.
 * Includes static pages plus every active product, paginated through D1.
 * Pages that are noindex (minigame) or placeholders (/collabs/:slug) are
 * intentionally excluded — a sitemap should only list URLs we want indexed.
 */

import { getCatalogPage } from "./catalog.js";
import { canonicalUrl, localizedUrl } from "./seo.js";

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/catalog", changefreq: "daily", priority: "0.9" },
  { path: "/crocs", changefreq: "daily", priority: "0.9" },
  { path: "/adidas", changefreq: "daily", priority: "0.8" },
  { path: "/collabs", changefreq: "weekly", priority: "0.6" },
  { path: "/delivery", changefreq: "monthly", priority: "0.5" },
  { path: "/about", changefreq: "monthly", priority: "0.4" }
];

const PAGE_SIZE = 100;
const MAX_PRODUCTS = 5000; // safety ceiling; revisit if catalog grows past this

/**
 * Fetches every active product's { slug, updatedAt } by walking
 * getCatalogPage with a large page size. Cheap enough at current catalog
 * sizes (a few hundred SKUs); if the catalog grows substantially, switch
 * to a dedicated "all slugs" query.
 */
async function getAllProducts(env) {
  const products = [];
  let offset = 0;

  while (offset < MAX_PRODUCTS) {
    const { products: page, total } = await getCatalogPage(env, {
      limit: PAGE_SIZE,
      offset,
      sort: "newest"
    });

    for (const p of page) products.push({ slug: p.slug, updatedAt: p.updatedAt });

    offset += PAGE_SIZE;
    if (offset >= total) break;
  }

  return products;
}

/**
 * Normalizes a D1 timestamp ("2026-06-20 14:33:07" or ISO) down to the
 * YYYY-MM-DD form sitemaps expect. Returns null on anything unparseable
 * so callers can simply omit <lastmod> rather than emit a bad date.
 */
function toLastmod(timestamp) {
  if (!timestamp) return null;
  const d = new Date(timestamp.includes("T") ? timestamp : timestamp.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Builds a <url> entry, including hreflang alternates as <xhtml:link>
 * children. Every URL has both an ru (default, clean path) and an en
 * (?lang=en) version — annotating both here is how search engines find
 * the English version at all, since nothing else links to it directly.
 *
 * lastmod is only emitted when we have a real, known modification date
 * (e.g. a product's updated_at) — never a fabricated "today", which
 * Google explicitly discourages and can cause it to start ignoring the
 * field on the whole sitemap.
 */
function urlEntry(appConfig, path, { changefreq, priority, lastmod } = {}) {
  const ruHref = localizedUrl(appConfig, path, "ru");
  const enHref = localizedUrl(appConfig, path, "en");
  const lastmodValue = toLastmod(lastmod);
  return [
    "  <url>",
    `    <loc>${ruHref}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="ru" href="${ruHref}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${enHref}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${ruHref}" />`,
    lastmodValue ? `    <lastmod>${lastmodValue}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>"
  ].filter(Boolean).join("\n");
}

/**
 * Builds the full sitemap.xml document as a string.
 */
export async function buildSitemap(appConfig, env) {
  const entries = STATIC_PAGES.map(p =>
    urlEntry(appConfig, p.path, p)
  );

  try {
    const products = await getAllProducts(env);
    for (const p of products) {
      entries.push(
        urlEntry(appConfig, `/product/${p.slug}`, {
          changefreq: "weekly",
          priority: "0.7",
          lastmod: p.updatedAt
        })
      );
    }
  } catch (err) {
    // If D1 is unreachable, still serve the static pages rather than
    // failing the whole sitemap — partial sitemap beats a 500.
    console.error("sitemap: failed to load product slugs", err);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}
