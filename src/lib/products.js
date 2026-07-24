/**
 * Fetch active products for the storefront.
 * Returns an array ready for the landing page template.
 */
export async function getActiveProducts(env, { limit = 6 } = {}) {
  const { results } = await env.DB.prepare(`
    SELECT
      p.id,
      p.title,
      p.slug,
      p.description,
      p.badge,
      pv.price_minor,
      pv.compare_at_minor,
      pi.r2_key
    FROM products p
    LEFT JOIN product_variants pv ON pv.product_id = p.id
      AND pv.is_active = 1
      AND pv.inventory_quantity > 0
    LEFT JOIN product_images pi ON pi.product_id = p.id
      AND pi.position = 0
    WHERE p.status = 'active'
      AND p.badge = 'hit'
    GROUP BY p.id
    ORDER BY
      p.created_at DESC
    LIMIT ?
  `).bind(limit).all();

  return results.map(row => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description || "",
    badge: row.badge || null,
    badgeClass: row.badge || null,
    price: row.price_minor
      ? formatPrice(row.price_minor)
      : null,
    comparePrice: row.compare_at_minor
      ? formatPrice(row.compare_at_minor)
      : null,
    image: row.r2_key
      ? `/r2/${row.r2_key}`
      : "/crops/product-placeholder.png"
  }));
}

function formatPrice(minor) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0
  }).format(minor / 100);
}
