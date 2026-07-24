import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest } from "../src/server.js";
import { renderAdminPage } from "../src/pages/admin/index.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";

/**
 * xss-regression.test.js
 *
 * These tests guard against a class of bug found in a security audit:
 * product data (title, description, image src/alt) and cart-item data
 * (sourced from the kokoc_cart localStorage blob) were interpolated
 * directly into `el.innerHTML = ...` in client-side <script> blocks,
 * with no escaping. A product title or cart item title containing
 * `<script>` or an `onerror=` attribute would execute for every
 * visitor who opened the quick-view modal or the cart drawer.
 *
 * The fix introduces a client-side `clientEscHtml()` helper (mirroring
 * the existing server-side `escHtml()` already used for the initial
 * SSR product cards) and applies it at every innerHTML call site that
 * handles product- or cart-derived strings.
 *
 * Because these call sites live inside a server-rendered <script> blob
 * (not as importable functions), we assert against the *generated HTML
 * source* of each page rather than executing the script in a DOM. This
 * is a static, source-level guard: it will fail loudly if someone
 * reintroduces an unescaped `p.title` / `item.title` / `img.alt` /
 * `img.src` interpolation, or removes the `clientEscHtml` definition.
 */

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);

async function getHtml(path) {
  const response = await handleRequest(request(path), makeEnv(), {});
  expect(response.status).toBe(200);
  return response.text();
}

describe("XSS regression — quick-view modal (catalog, crocs, adidas)", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  const pagesWithQuickView = ["/catalog", "/crocs", "/adidas"];

  for (const path of pagesWithQuickView) {
    it(`${path}: defines a client-side HTML-escaping helper`, async () => {
      const html = await getHtml(path);
      expect(html).toContain("function clientEscHtml(");
    });

    it(`${path}: escapes the quick-view title instead of interpolating p.title raw`, async () => {
      const html = await getHtml(path);
      // The raw, unescaped interpolation that caused the vulnerability:
      expect(html).not.toContain("'<h2 class=\"qv-title\">' + p.title + '</h2>'");
      // The fixed call site assigns to a pre-escaped local first:
      expect(html).toContain("const safeTitle = clientEscHtml(p.title");
      expect(html).toContain("'<h2 class=\"qv-title\">' + safeTitle + '</h2>'");
    });

    it(`${path}: escapes the quick-view description instead of interpolating p.description raw`, async () => {
      const html = await getHtml(path);
      expect(html).not.toContain("'<p class=\"qv-desc\">' + p.description + '</p>'");
      expect(html).toContain("const safeDescription = clientEscHtml(p.description");
    });

    it(`${path}: escapes gallery image src/alt before building <img> markup`, async () => {
      const html = await getHtml(path);
      // images[] must be rebuilt through clientEscHtml, not used verbatim from the API response
      expect(html).toContain("clientEscHtml(img.src || '')");
      expect(html).toContain("clientEscHtml(img.alt || '')");
    });

    it(`${path}: escapes variant size labels in size chips`, async () => {
      const html = await getHtml(path);
      expect(html).not.toContain("(v.crocsSize || v.sizeLabel || v.title) +");
      expect(html).toContain("clientEscHtml(v.crocsSize || v.sizeLabel || v.title || '')");
    });
  }
});

describe("XSS regression — cart drawer (navbar.js shared module + product.js)", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  // Pages that render via the shared navbar.js cart drawer
  const navbarPages = ["/catalog", "/crocs", "/adidas", "/about", "/delivery"];

  for (const path of navbarPages) {
    it(`${path}: shared cart drawer escapes item title/image/size before innerHTML`, async () => {
      const html = await getHtml(path);
      // escHtml is now an alias for the shared clientEscHtml() helper
      // (single source of truth in lib/html.js, injected via
      // CLIENT_ESC_HTML_SRC) rather than its own copy-pasted definition.
      expect(html).toContain("function clientEscHtml(s)");
      expect(html).toContain("const escHtml = clientEscHtml;");
      expect(html).toContain("const safeImage = escHtml(item.image");
      expect(html).toContain("const safeTitle = escHtml(item.title");
      expect(html).toContain("const safeSize = escHtml(item.sizeLabel");
      // The old vulnerable interpolation must be gone
      expect(html).not.toContain('src="${item.image ||');
      expect(html).not.toContain('alt="${item.title ||');
    });
  }

  it("/product/:slug: standalone cart drawer escapes item title/image/size before innerHTML", async () => {
    const html = await getHtml("/product/classic-clog");
    expect(html).toContain("function clientEscHtml(");
    expect(html).toContain("const safeImage = clientEscHtml(item.image");
    expect(html).toContain("const safeTitle = clientEscHtml(item.title");
    expect(html).toContain("const safeSize = clientEscHtml(item.sizeLabel");
    // The old vulnerable interpolation must be gone
    expect(html).not.toContain('src="${item.image}"');
    expect(html).not.toContain('alt="${item.title}"');
  });
});

describe("Cart localStorage resilience", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("/product/:slug: guards against malformed kokoc_cart before wiring size/add buttons", async () => {
    const html = await getHtml("/product/classic-clog");

    expect(html).toContain("function readCart()");
    expect(html).toContain("Array.isArray(value.items)");
    expect(html).toContain("catch {");
    expect(html).toContain("let cart = readCart();");
  });

  it("/product/:slug: guards malformed kokoc_favs before size/add handlers are registered", async () => {
    const html = await getHtml("/product/classic-clog");

    expect(html).toContain("function readFavs()");
    expect(html).toContain("const favs = readFavs();");
    expect(html).not.toContain('const favs = new Set(JSON.parse(localStorage.getItem("kokoc_favs")');
  });

  for (const path of ["/catalog", "/crocs", "/adidas"]) {
    it(`${path}: quick-view add-to-cart uses the shared safe cart reader`, async () => {
      const html = await getHtml(path);

      expect(html).toContain("window.kokocReadCart = readCart");
      expect(html).toContain("let cart = window.kokocReadCart ? window.kokocReadCart() : { items: [] };");
      expect(html).not.toContain("let cart = JSON.parse(localStorage.getItem('kokoc_cart')");
    });

    it(`${path}: shared navbar guards malformed kokoc_favs`, async () => {
      const html = await getHtml(path);

      expect(html).toContain("function readFavs()");
      expect(html).toContain("const favs = readFavs();");
      expect(html).not.toContain("const favs = new Set(JSON.parse(localStorage.getItem('kokoc_favs')");
    });
  }
});

describe("XSS regression — admin SPA (pages/admin/)", () => {
  /**
   * A previous security audit (see other describe blocks in this file)
   * fixed client-side innerHTML escaping on the storefront, but missed
   * pages/admin/, which had its own, separately copy-pasted `esc()`
   * helper that forgot to escape the single-quote character.
   *
   * Several call sites interpolate `esc(...)`-wrapped values inside a
   * single-quoted HTML attribute, e.g.:
   *   onclick="showClientDetail('${esc(c.email)}')"
   *   onclick="deleteProduct('${p.id}', '${esc(p.title)}')"
   *
   * c.email comes from a customer-submitted order and p.title is
   * admin-entered, but neither should be trusted to be free of `'` —
   * an unescaped quote breaks out of the onclick string and allows
   * arbitrary JS execution in the admin's browser.
   *
   * admin.js now reuses the same shared `clientEscHtml` source as the
   * storefront pages (via CLIENT_ESC_HTML_SRC from lib/html.js) under
   * a local `esc` alias, so this is a single implementation again.
   */
  it("defines esc() as an alias for the shared clientEscHtml() helper", () => {
    const html = renderAdminPage({ page: "app" });
    expect(html).toContain("function clientEscHtml(s)");
    expect(html).toContain("const esc = clientEscHtml;");
  });

  it("esc() escapes single quotes (the bug that broke out of onclick='...')", () => {
    const html = renderAdminPage({ page: "app" });
    const match = html.match(/function clientEscHtml\(s\) \{[\s\S]*?\n\s*\}/);
    expect(match).not.toBeNull();
    // eslint-disable-next-line no-new-func
    const clientEscHtml = new Function(`${match[0]}; return clientEscHtml;`)();
    const malicious = "o'brien@test.com";
    const escaped = clientEscHtml(malicious);
    expect(escaped).not.toContain("'");
    expect(escaped).toContain("&#39;");
  });

  it("client-script call sites still use esc() for email/title interpolated into onclick attributes", () => {
    const html = renderAdminPage({ page: "app" });
    expect(html).toContain("showClientDetail('${esc(c.email)}')");
    expect(html).toContain("deleteProduct('${p.id}', '${esc(p.title)}')");
  });
});
