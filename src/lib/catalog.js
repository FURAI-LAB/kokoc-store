/**
 * catalog.js — D1 queries for the public /catalog and /adidas pages
 * Pass brand = "Adidas Originals" to scope to that brand only.
 */

const fmt = (minor) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(minor / 100);

/**
 * getCatalogPage — paginated product list for /catalog (and /adidas with brand filter)
 */
export async function getCatalogPage(env, {
  limit = 12,
  offset = 0,
  sort = "newest",
  tag = null,
  q = null,
  brand = null,
} = {}) {

  const ORDER = {
    newest:     "p.created_at DESC",
    price_asc:  "min_price ASC",
    price_desc: "min_price DESC",
  }[sort] || "p.created_at DESC";

  const brandFilter  = brand ? `AND p.brand = ?`                                        : "";
  const tagFilter    = tag   ? `AND (',' || p.tags || ',' LIKE '%,' || ? || ',%')`      : "";
  const searchFilter = q     ? `AND (p.title LIKE ? OR p.description LIKE ?)`           : "";

  const searchBinds = q ? [`%${q}%`, `%${q}%`] : [];

  const countBinds = [
    ...(brand ? [brand] : []),
    ...(tag   ? [tag]   : []),
    ...searchBinds,
  ];
  const listBinds = [...countBinds, limit, offset];

  /* Total count for pagination */
  const { total } = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM products p
    WHERE p.status = 'active'
    ${brandFilter}
    ${tagFilter}
    ${searchFilter}
  `).bind(...countBinds).first();

  /* Product list with cheapest active variant price */
  const { results } = await env.DB.prepare(`
    SELECT
      p.id,
      p.title,
      p.slug,
      p.description,
      p.badge,
      p.tags,
      p.gender,
      p.apparel_type,
      p.created_at,
      p.updated_at,
      MIN(pv.price_minor)          AS min_price,
      MIN(pv.compare_at_minor)     AS compare_price,
      pi.r2_key
    FROM products p
    LEFT JOIN product_variants pv ON pv.product_id = p.id
      AND pv.is_active = 1
      AND pv.inventory_quantity > 0
    LEFT JOIN product_images pi ON pi.product_id = p.id
      AND pi.position = 0
    WHERE p.status = 'active'
    ${brandFilter}
    ${tagFilter}
    ${searchFilter}
    GROUP BY p.id
    ORDER BY ${ORDER}
    LIMIT ? OFFSET ?
  `).bind(...listBinds).all();

  return {
    total: Number(total),
    limit,
    offset,
    products: results.map(row => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description || "",
      badge: row.badge || null,
      tags: row.tags ? row.tags.split(",").map(t => t.trim()) : [],
      gender: row.gender || null,
      apparelType: row.apparel_type || null,
      price: row.min_price ? fmt(row.min_price) : null,
      comparePrice: row.compare_price ? fmt(row.compare_price) : null,
      image: row.r2_key ? `/r2/${row.r2_key}` : "/crops/product-placeholder.png",
      updatedAt: row.updated_at || row.created_at || null,
    })),
  };
}

/**
 * getProductDetail — full product data for quick-view
 * Returns product + all variants (with crocs_size) + all images
 * + approved reviews and the cached rating aggregate (migration 006).
 */
export async function getProductDetail(env, slug) {
  const product = await env.DB.prepare(
    `SELECT * FROM products WHERE slug = ? AND status = 'active'`
  ).bind(slug).first();

  if (!product) return null;

  const { results: variants } = await env.DB.prepare(`
    SELECT id, sku, title, size_label, crocs_size, color_label,
           price_minor, compare_at_minor, inventory_quantity, is_active
    FROM product_variants
    WHERE product_id = ? AND is_active = 1
    ORDER BY price_minor ASC
  `).bind(product.id).all();

  const { results: images } = await env.DB.prepare(`
    SELECT id, r2_key, alt_text, position
    FROM product_images
    WHERE product_id = ?
    ORDER BY position ASC
  `).bind(product.id).all();

  const { results: reviews } = await env.DB.prepare(`
    SELECT id, author_name, rating, title, body, created_at
    FROM product_reviews
    WHERE product_id = ? AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(product.id).all();

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description || "",
    brand: product.brand || null,
    badge: product.badge || null,
    tags: product.tags ? product.tags.split(",").map(t => t.trim()) : [],
    gender: product.gender || null,
    apparelType: product.apparel_type || null,
    ratingAvg: product.rating_avg ?? null,
    ratingCount: product.rating_count || 0,
    reviews: reviews.map(r => ({
      id: r.id,
      authorName: r.author_name,
      rating: r.rating,
      title: r.title || null,
      body: r.body,
      createdAt: r.created_at,
    })),
    variants: variants.map(v => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      sizeLabel: v.size_label || null,
      crocsSize: v.crocs_size || null,
      colorLabel: v.color_label || null,
      price: v.price_minor ? fmt(v.price_minor) : null,
      priceMinor: v.price_minor,
      comparePrice: v.compare_at_minor ? fmt(v.compare_at_minor) : null,
      inStock: v.inventory_quantity > 0,
    })),
    images: images.map(img => ({
      id: img.id,
      src: img.r2_key ? `/r2/${img.r2_key}` : "/crops/product-placeholder.png",
      alt: img.alt_text || product.title,
    })),
  };
}
