import { beforeEach, describe, expect, it } from "vitest";
import { createProduct, updateProduct, getProduct } from "../src/routes/admin/products.js";
import { makeEnv, setupTestDatabase, PRODUCT_IDS } from "./fixtures.js";

/**
 * admin.products.description.test.js
 *
 * The admin item-form description field is a rich-text editor (bold,
 * italic, H3, paragraphs, bullet list) rather than a plain textarea —
 * see item-form.js. Its output is arbitrary browser-generated HTML
 * (document.execCommand), so it must be run through
 * sanitizeDescriptionHtml() before it's written to `products.description`,
 * the same way the security audit's XSS fixes sanitize other
 * admin/visitor-supplied HTML. These tests exercise that at the DB
 * round-trip level (create/update → read back), not just the sanitizer
 * unit tests in rich-text.test.js.
 */
describe("admin products API — description sanitization", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("createProduct: strips a script tag out of the description before storing it", async () => {
    const env = makeEnv();
    const res = await createProduct(env, {
      title: "Test Product",
      slug: "test-product-xss",
      description: "<p>Nice shoes</p><script>alert(document.cookie)</script>",
    });
    const body = await res.json();
    expect(body.ok).toBe(true);

    const stored = await env.DB.prepare("SELECT description FROM products WHERE id = ?")
      .bind(body.id)
      .first();
    expect(stored.description).toBe("<p>Nice shoes</p>");
  });

  it("createProduct: strips attributes (onerror=) even though the tag itself is disallowed", async () => {
    const env = makeEnv();
    const res = await createProduct(env, {
      title: "Test Product 2",
      slug: "test-product-xss-2",
      description: '<img src="x" onerror="alert(1)">Caption text',
    });
    const body = await res.json();

    const stored = await env.DB.prepare("SELECT description FROM products WHERE id = ?")
      .bind(body.id)
      .first();
    expect(stored.description).not.toContain("onerror");
    expect(stored.description).not.toContain("<img");
    expect(stored.description).toContain("Caption text");
  });

  it("createProduct: keeps allow-listed formatting (h3/strong/em/ul/li) intact", async () => {
    const env = makeEnv();
    const description =
      "<h3>О товаре</h3><p>Мягкие сабо из <strong>Croslite</strong>.</p><ul><li>Легкие</li><li>Водостойкие</li></ul>";
    const res = await createProduct(env, {
      title: "Test Product 3",
      slug: "test-product-formatting",
      description,
    });
    const body = await res.json();

    const stored = await env.DB.prepare("SELECT description FROM products WHERE id = ?")
      .bind(body.id)
      .first();
    expect(stored.description).toBe(description);
  });

  it("updateProduct: sanitizes a description containing a javascript: link on edit", async () => {
    const env = makeEnv();
    await updateProduct(env, PRODUCT_IDS.classic, {
      description: '<p>See <a href="javascript:alert(1)">details</a></p>',
    });

    const stored = await env.DB.prepare("SELECT description FROM products WHERE id = ?")
      .bind(PRODUCT_IDS.classic)
      .first();
    expect(stored.description).not.toContain("javascript:");
    expect(stored.description).not.toContain("<a");
    expect(stored.description).toBe("<p>See details</p>");
  });

  it("updateProduct: an explicit empty-string description clears the field instead of being ignored", async () => {
    const env = makeEnv();
    // Sanity check: classic starts with a non-empty description.
    const before = await getProduct(env, PRODUCT_IDS.classic).then((r) => r.json());
    expect(before.product.description).toBeTruthy();

    await updateProduct(env, PRODUCT_IDS.classic, { description: "" });

    const stored = await env.DB.prepare("SELECT description FROM products WHERE id = ?")
      .bind(PRODUCT_IDS.classic)
      .first();
    expect(stored.description).toBeNull();
  });

  it("updateProduct: omitting description entirely leaves the existing value untouched", async () => {
    const env = makeEnv();
    const before = await getProduct(env, PRODUCT_IDS.classic).then((r) => r.json());

    await updateProduct(env, PRODUCT_IDS.classic, { title: "Renamed but description untouched" });

    const stored = await env.DB.prepare("SELECT description FROM products WHERE id = ?")
      .bind(PRODUCT_IDS.classic)
      .first();
    expect(stored.description).toBe(before.product.description);
  });
});
