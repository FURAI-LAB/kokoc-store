import { applyD1Migrations, env } from "cloudflare:test";

const TABLES = [
  "cart_items",
  "carts",
  "minigame_sessions",
  "order_items",
  "orders",
  "product_images",
  "product_variants",
  "products",
  "promo_codes",
  "subscribers"
];

export const PRODUCT_IDS = {
  classic: "prod_classic",
  platform: "prod_platform",
  draft: "prod_draft"
};

export const VARIANT_IDS = {
  classic39: "var_classic_39",
  classic40: "var_classic_40",
  platform38: "var_platform_38",
  draft: "var_draft"
};

export function makeEnv(overrides = {}) {
  return {
    DB: env.DB,
    KV: env.KV ?? {
      get: async () => null,
      put: async () => undefined,
      delete: async () => undefined
    },
    PRODUCT_IMAGES: env.PRODUCT_IMAGES,
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 })
    },
    ...overrides
  };
}

// @cloudflare/vitest-pool-workers never populates request.cf (no real Edge
// in the test runner), so getLocaleFromRequest's geo-detection fallback
// (request.cf?.country === "RU" → "ru") always sees an empty country and
// resolves to "en". Tests that want to exercise the "no cookie, no ?lang=,
// visitor from Russia" path need to pass cf explicitly — this helper does
// that consistently instead of every test file hand-rolling { cf: {...} }.
export function ruRequest(path, init = {}) {
  return new Request(`https://kokoc.store${path}`, { ...init, cf: { country: "RU", ...init.cf } });
}

export async function setupTestDatabase() {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  await resetDatabase();
  await seedCatalog();
}

export async function resetDatabase() {
  await env.DB.batch(TABLES.map((table) => env.DB.prepare(`DELETE FROM ${table}`)));
}

async function seedCatalog() {
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO products (
        id, slug, title, description, brand, status, badge, tags,
        category, sku, price_minor, compare_at_minor, inventory_quantity,
        visibility, sizes, colors, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      PRODUCT_IDS.classic,
      "classic-clog",
      "Classic Clog",
      "Everyday Crocs silhouette",
      "Kokoc Store",
      "active",
      "hit",
      "crocs,classic,summer",
      "crocs",
      "KOKOC-CLASSIC",
      499000,
      599000,
      8,
      "visible",
      "M5 W7,M6 W8",
      "Bone,Black",
      "2026-05-30T10:00:00.000Z"
    ),
    env.DB.prepare(`
      INSERT INTO products (
        id, slug, title, description, brand, status, badge, tags,
        category, sku, price_minor, compare_at_minor, inventory_quantity,
        visibility, sizes, colors, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      PRODUCT_IDS.platform,
      "platform-clog",
      "Platform Clog",
      "Chunky platform pair",
      "Kokoc Store",
      "active",
      "new",
      "crocs,platform",
      "crocs",
      "KOKOC-PLATFORM",
      699000,
      null,
      3,
      "visible",
      "M4 W6",
      "White",
      "2026-06-01T10:00:00.000Z"
    ),
    env.DB.prepare(`
      INSERT INTO products (
        id, slug, title, description, brand, status, badge, tags,
        category, sku, price_minor, compare_at_minor, inventory_quantity,
        visibility, sizes, colors, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      PRODUCT_IDS.draft,
      "hidden-clog",
      "Hidden Clog",
      "Draft product",
      "Kokoc Store",
      "draft",
      null,
      "crocs",
      "crocs",
      "KOKOC-DRAFT",
      199000,
      null,
      1,
      "hidden",
      "M5 W7",
      "Black",
      "2026-06-02T10:00:00.000Z"
    )
  ]);

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO product_variants (
        id, product_id, sku, title, size_label, crocs_size, color_label,
        price_minor, compare_at_minor, inventory_quantity, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      VARIANT_IDS.classic39,
      PRODUCT_IDS.classic,
      "CLASSIC-39-BONE",
      "M5 W7 / Bone",
      "39",
      "M5 W7",
      "Bone",
      499000,
      599000,
      5,
      1
    ),
    env.DB.prepare(`
      INSERT INTO product_variants (
        id, product_id, sku, title, size_label, crocs_size, color_label,
        price_minor, compare_at_minor, inventory_quantity, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      VARIANT_IDS.classic40,
      PRODUCT_IDS.classic,
      "CLASSIC-40-BLACK",
      "M6 W8 / Black",
      "40",
      "M6 W8",
      "Black",
      529000,
      null,
      0,
      1
    ),
    env.DB.prepare(`
      INSERT INTO product_variants (
        id, product_id, sku, title, size_label, crocs_size, color_label,
        price_minor, compare_at_minor, inventory_quantity, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      VARIANT_IDS.platform38,
      PRODUCT_IDS.platform,
      "PLATFORM-38-WHITE",
      "M4 W6 / White",
      "38",
      "M4 W6",
      "White",
      699000,
      null,
      3,
      1
    ),
    env.DB.prepare(`
      INSERT INTO product_variants (
        id, product_id, sku, title, size_label, crocs_size, color_label,
        price_minor, compare_at_minor, inventory_quantity, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      VARIANT_IDS.draft,
      PRODUCT_IDS.draft,
      "DRAFT-39-BLACK",
      "M5 W7 / Black",
      "39",
      "M5 W7",
      "Black",
      199000,
      null,
      1,
      1
    )
  ]);

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO product_images (id, product_id, variant_id, r2_key, alt_text, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind("img_classic_0", PRODUCT_IDS.classic, null, "products/classic-main.jpg", "Classic Clog", 0),
    env.DB.prepare(`
      INSERT INTO product_images (id, product_id, variant_id, r2_key, alt_text, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind("img_classic_1", PRODUCT_IDS.classic, VARIANT_IDS.classic39, "products/classic-side.jpg", "Classic Clog side", 1),
    env.DB.prepare(`
      INSERT INTO product_images (id, product_id, variant_id, r2_key, alt_text, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind("img_platform_0", PRODUCT_IDS.platform, null, "products/platform-main.jpg", "Platform Clog", 0)
  ]);
}
