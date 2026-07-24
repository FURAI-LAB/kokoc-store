import { jsonResponse } from "../../lib/response.js";
import { sanitizeDescriptionHtml } from "../../lib/rich-text.js";

function id() { return crypto.randomUUID(); }

const VALID_BADGES = new Set(["new", "hit", "limited", null]);
const VALID_GENDERS = new Set(["men", "women", null]);
const VALID_APPAREL_TYPES = new Set(["top", "bottom", null]);

// ── Products ──────────────────────────────────────────────────

export async function listProducts(env) {
  const { results } = await env.DB.prepare(`
    SELECT p.id, p.slug, p.title, p.description, p.brand,
           p.status, p.badge, p.tags, p.category, p.sku,
           p.price_minor, p.compare_at_minor, p.inventory_quantity,
           p.visibility, p.sizes, p.colors, p.gender, p.apparel_type,
           p.created_at, p.updated_at,
           COUNT(v.id) AS variant_count
    FROM products p
    LEFT JOIN product_variants v ON v.product_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 200
  `).all();
  return jsonResponse({ ok: true, products: results });
}

export async function getProduct(env, productId) {
  const product = await env.DB.prepare(
    `SELECT * FROM products WHERE id = ?`
  ).bind(productId).first();

  if (!product) return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });

  const { results: variants } = await env.DB.prepare(
    `SELECT * FROM product_variants WHERE product_id = ? ORDER BY created_at`
  ).bind(productId).all();

  const { results: images } = await env.DB.prepare(
    `SELECT * FROM product_images WHERE product_id = ? ORDER BY position`
  ).bind(productId).all();

  return jsonResponse({ ok: true, product, variants, images });
}

export async function createProduct(env, body) {
  const {
    title, slug, description,
    brand = "Kokoc Store",
    status = "draft",
    badge = null,
    tags = null,
    category = null,
    sku = null,
    price_minor = 0,
    compare_at_minor = null,
    inventory_quantity = 0,
    visibility = "visible",
    sizes = null,
    colors = null,
    gender = null,
    apparel_type = null,
  } = body;

  if (!title || !slug) {
    return jsonResponse({ ok: false, error: "title and slug required" }, { status: 400 });
  }
  if (!VALID_BADGES.has(badge)) {
    return jsonResponse({ ok: false, error: "badge must be: new | hit | limited | null" }, { status: 400 });
  }
  if (!VALID_GENDERS.has(gender)) {
    return jsonResponse({ ok: false, error: "gender must be: men | women | null" }, { status: 400 });
  }
  if (!VALID_APPAREL_TYPES.has(apparel_type)) {
    return jsonResponse({ ok: false, error: "apparel_type must be: top | bottom | null" }, { status: 400 });
  }

  const productId = id();
  await env.DB.prepare(`
    INSERT INTO products
      (id, slug, title, description, brand, status, badge, tags,
       category, sku, price_minor, compare_at_minor, inventory_quantity,
       visibility, sizes, colors, gender, apparel_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    productId, slug, title, sanitizeDescriptionHtml(description), brand, status, badge, tags || null,
    category || null, sku || null,
    price_minor, compare_at_minor ?? null,
    inventory_quantity,
    visibility,
    sizes || null, colors || null,
    gender || null, apparel_type || null
  ).run();

  return jsonResponse({ ok: true, id: productId }, { status: 201 });
}

export async function updateProduct(env, productId, body) {
  const {
    title, slug, description, brand, status, badge, tags,
    category, sku, price_minor, compare_at_minor,
    inventory_quantity, visibility, sizes, colors,
    gender, apparel_type,
  } = body;

  if (badge !== undefined && !VALID_BADGES.has(badge)) {
    return jsonResponse({ ok: false, error: "badge must be: new | hit | limited | null" }, { status: 400 });
  }
  if (gender !== undefined && !VALID_GENDERS.has(gender)) {
    return jsonResponse({ ok: false, error: "gender must be: men | women | null" }, { status: 400 });
  }
  if (apparel_type !== undefined && !VALID_APPAREL_TYPES.has(apparel_type)) {
    return jsonResponse({ ok: false, error: "apparel_type must be: top | bottom | null" }, { status: 400 });
  }

  await env.DB.prepare(`
    UPDATE products SET
      title              = COALESCE(?, title),
      slug               = COALESCE(?, slug),
      description        = CASE WHEN ? IS NOT NULL THEN ? ELSE description END,
      brand              = COALESCE(?, brand),
      status             = COALESCE(?, status),
      badge              = CASE WHEN ? IS NOT NULL THEN ? ELSE badge END,
      tags               = CASE WHEN ? IS NOT NULL THEN ? ELSE tags END,
      category           = COALESCE(?, category),
      sku                = COALESCE(?, sku),
      price_minor        = COALESCE(?, price_minor),
      compare_at_minor   = COALESCE(?, compare_at_minor),
      inventory_quantity = COALESCE(?, inventory_quantity),
      visibility         = COALESCE(?, visibility),
      sizes              = COALESCE(?, sizes),
      colors             = COALESCE(?, colors),
      gender             = CASE WHEN ? IS NOT NULL THEN ? ELSE gender END,
      apparel_type       = CASE WHEN ? IS NOT NULL THEN ? ELSE apparel_type END,
      updated_at         = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    title       ?? null,
    slug        ?? null,
    body.hasOwnProperty("description") ? "SET" : null,
    body.hasOwnProperty("description") ? sanitizeDescriptionHtml(description) : null,
    brand       ?? null,
    status      ?? null,
    body.hasOwnProperty("badge") ? "SET" : null, badge ?? null,
    body.hasOwnProperty("tags")  ? "SET" : null, tags  ?? null,
    category           ?? null,
    sku                ?? null,
    price_minor        ?? null,
    compare_at_minor   ?? null,
    inventory_quantity ?? null,
    visibility         ?? null,
    sizes              ?? null,
    colors             ?? null,
    body.hasOwnProperty("gender")       ? "SET" : null, gender       ?? null,
    body.hasOwnProperty("apparel_type") ? "SET" : null, apparel_type ?? null,
    productId
  ).run();

  return jsonResponse({ ok: true });
}

export async function deleteProduct(env, productId) {
  await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(productId).run();
  return jsonResponse({ ok: true });
}

// ── Variants ──────────────────────────────────────────────────

export async function createVariant(env, productId, body) {
  const {
    sku, title,
    size_label, crocs_size,
    color_label,
    price_minor, compare_at_minor,
    inventory_quantity = 0,
  } = body;

  if (!sku || !title || price_minor == null) {
    return jsonResponse({ ok: false, error: "sku, title, price_minor required" }, { status: 400 });
  }

  const variantId = id();
  await env.DB.prepare(`
    INSERT INTO product_variants
      (id, product_id, sku, title, size_label, crocs_size, color_label,
       price_minor, compare_at_minor, inventory_quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    variantId, productId, sku, title,
    size_label   ?? null,
    crocs_size   ?? null,
    color_label  ?? null,
    price_minor,
    compare_at_minor ?? null,
    inventory_quantity
  ).run();

  return jsonResponse({ ok: true, id: variantId }, { status: 201 });
}

export async function updateVariant(env, variantId, body) {
  const {
    title, size_label, crocs_size,
    color_label, price_minor,
    compare_at_minor, inventory_quantity, is_active,
  } = body;

  await env.DB.prepare(`
    UPDATE product_variants SET
      title              = COALESCE(?, title),
      size_label         = COALESCE(?, size_label),
      crocs_size         = COALESCE(?, crocs_size),
      color_label        = COALESCE(?, color_label),
      price_minor        = COALESCE(?, price_minor),
      compare_at_minor   = COALESCE(?, compare_at_minor),
      inventory_quantity = COALESCE(?, inventory_quantity),
      is_active          = COALESCE(?, is_active),
      updated_at         = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    title              ?? null,
    size_label         ?? null,
    crocs_size         ?? null,
    color_label        ?? null,
    price_minor        ?? null,
    compare_at_minor   ?? null,
    inventory_quantity ?? null,
    is_active          ?? null,
    variantId
  ).run();

  return jsonResponse({ ok: true });
}

export async function deleteVariant(env, variantId) {
  await env.DB.prepare(`DELETE FROM product_variants WHERE id = ?`).bind(variantId).run();
  return jsonResponse({ ok: true });
}

// ── Images (R2) ───────────────────────────────────────────────

export async function uploadImage(env, productId, request) {
  if (!env.PRODUCT_IMAGES) {
    return jsonResponse({ ok: false, error: "R2 bucket not bound" }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file) return jsonResponse({ ok: false, error: "file required" }, { status: 400 });

  const ext    = file.name.split(".").pop().toLowerCase();
  const r2Key  = `products/${productId}/${id()}.${ext}`;
  const position  = parseInt(formData.get("position") || "0", 10);
  const variantId = formData.get("variant_id") || null;
  const altText   = formData.get("alt_text")   || null;

  await env.PRODUCT_IMAGES.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const imageId = id();
  await env.DB.prepare(`
    INSERT INTO product_images (id, product_id, variant_id, r2_key, alt_text, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(imageId, productId, variantId, r2Key, altText, position).run();

  return jsonResponse({ ok: true, id: imageId, r2_key: r2Key }, { status: 201 });
}

export async function deleteImage(env, imageId) {
  const img = await env.DB.prepare(
    `SELECT r2_key FROM product_images WHERE id = ?`
  ).bind(imageId).first();

  if (img && env.PRODUCT_IMAGES) await env.PRODUCT_IMAGES.delete(img.r2_key);
  await env.DB.prepare(`DELETE FROM product_images WHERE id = ?`).bind(imageId).run();
  return jsonResponse({ ok: true });
}
