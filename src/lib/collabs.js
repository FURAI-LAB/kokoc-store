/**
 * Collabs data.
 * Static for now — wire to D1 later when collab table exists.
 * Each entry: id, name, slug, description, logoUrl, bannerUrl, status, year, productTag
 *
 * productTag links a collab to storefront products: any product whose
 * `tags` column (comma-separated) contains this value shows up on the
 * collab's detail page and counts toward its "N товаров" badge.
 * Defaults to `collab-<slug>` when omitted — see collabProductTag().
 */
export const COLLABS = [
  {
    id: "crocs-classic",
    name: "Crocs Classic",
    slug: "crocs-classic",
    description: "A classic silhouette reimagined in Kokoc's pastel palette. Limited series with exclusive Jibbitz.",
    logoUrl: "/crops/collab-crocs-logo.png",
    bannerUrl: "/crops/collab-crocs-banner.png",
    status: "active",
    year: "2025",
    productTag: "collab-crocs-classic",
  },
  {
    id: "jibbitz-drop-1",
    name: "Jibbitz Drop #1",
    slug: "jibbitz-drop-1",
    description: "12 unique charms — cats, clouds, stars. The first original set from Kokoc × FURAI lab.",
    logoUrl: "/crops/collab-jibbitz-logo.png",
    bannerUrl: "/crops/collab-jibbitz-banner.png",
    status: "active",
    year: "2025",
    productTag: "collab-jibbitz-drop-1",
  },
  {
    id: "pastel-series",
    name: "Pastel Series",
    slug: "pastel-series",
    description: "A collaborative drop with Vietnamese artists. Hand-painted, limited to 50 pairs.",
    logoUrl: "/crops/collab-pastel-logo.png",
    bannerUrl: "/crops/collab-pastel-banner.png",
    status: "archive",
    year: "2024",
    productTag: "collab-pastel-series",
  },
];

/** The product tag used to link a collab to storefront products. */
export function collabProductTag(collab) {
  return collab.productTag || `collab-${collab.slug}`;
}

export function getCollabs({ status = null } = {}) {
  if (status) return COLLABS.filter(c => c.status === status);
  return COLLABS;
}

export function getCollabBySlug(slug) {
  return COLLABS.find(c => c.slug === slug) ?? null;
}

/**
 * Loads collabs from KV when available.
 * Used by server.js to render the public page.
 */
export async function getCollabsFromKV(env, options = {}) {
  try {
    const raw = await env.KV.get("collabs:list");
    const list = raw ? JSON.parse(raw) : COLLABS;
    if (options.status) return list.filter(c => c.status === options.status);
    return list;
  } catch {
    return getCollabs(options);
  }
}

/**
 * Counts active products tagged with each collab's productTag.
 * Returns a Map<collabId, count>. Missing DB or empty list resolves to
 * an empty map rather than throwing, so the page still renders.
 */
export async function getCollabProductCounts(env, collabs) {
  const counts = new Map();
  if (!env?.DB || !collabs?.length) return counts;

  try {
    const rows = await env.DB.batch(
      collabs.map(c =>
        env.DB.prepare(
          `SELECT COUNT(*) AS total FROM products
           WHERE status = 'active'
             AND (',' || tags || ',') LIKE '%,' || ? || ',%'`
        ).bind(collabProductTag(c))
      )
    );
    collabs.forEach((c, i) => {
      counts.set(c.id, Number(rows[i]?.results?.[0]?.total ?? 0));
    });
  } catch {
    // Leave counts empty on failure — cards simply omit the count badge.
  }
  return counts;
}

/**
 * Resolves one collab (by slug) plus its linked products for the
 * /collabs/:slug detail page. Delegates product fetching to
 * getCatalogPage so filtering, pricing, and image logic stay in one place.
 */
export async function getCollabDetail(env, slug, { getCatalogPage } = {}) {
  const list = await getCollabsFromKV(env);
  const collab = list.find(c => c.slug === slug) || null;
  if (!collab) return null;

  let products = [];
  let total = 0;
  if (getCatalogPage && env?.DB) {
    const data = await getCatalogPage(env, {
      tag: collabProductTag(collab),
      limit: 24,
      offset: 0,
      sort: "newest",
    });
    products = data.products;
    total = data.total;
  }

  return { collab, products, total };
}
