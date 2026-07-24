import { beforeEach, describe, expect, it } from "vitest";
import { renderNavbar } from "../src/lib/navbar.js";
import { i18n } from "../src/lib/i18n.js";
import { handleRequest } from "../src/server.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);
const appConfig = { domain: "kokoc.store" };

/* ── Unit tests: renderNavbar() in isolation, no HTTP ──────────────── */

describe("renderNavbar() — unit", () => {
  const tr = i18n("ru");

  it("renders every interactive control with a stable id", () => {
    const html = renderNavbar(appConfig, tr, "", "");
    for (const id of [
      "search-btn", "wishlist-btn", "cart-btn", "menu-btn",
      "search-input", "search-close",
      "cart-overlay", "cart-close", "checkout-btn",
      "payment-modal-overlay", "payment-modal-close",
      "wishlist-overlay", "wishlist-close",
      "menu-overlay", "menu-close"
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("renders cart-badge and wishlist-badge spans", () => {
    const html = renderNavbar(appConfig, tr, "", "");
    expect(html).toContain('id="cart-badge"');
    expect(html).toContain('id="wishlist-badge"');
  });

  it("links to all six canonical nav destinations, in order, on both desktop and mobile nav", () => {
    const html = renderNavbar(appConfig, tr, "", "");
    const expectedOrder = ["/crocs", "/adidas", "/catalog", "/collabs", "/delivery", "/about"];
    for (const nav of [/<nav class="desktop-nav">([\s\S]*?)<\/nav>/, /<nav class="mobile-nav">([\s\S]*?)<\/nav>/]) {
      const block = html.match(nav)[1];
      const hrefs = [...block.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs).toEqual(expectedOrder);
    }
  });

  it("marks no nav link active when activeKey is omitted", () => {
    const html = renderNavbar(appConfig, tr, "", "");
    expect(html).not.toContain('class="active"');
  });

  it("marks exactly the matching link active on both desktop and mobile nav", () => {
    const html = renderNavbar(appConfig, tr, "", "", "adidas");
    const activeLinks = [...html.matchAll(/<a href="([^"]+)" class="active">/g)].map((m) => m[1]);
    expect(activeLinks).toEqual(["/adidas", "/adidas"]);
  });

  it("builds a wa.me link from a digits-only WhatsApp number", () => {
    const html = renderNavbar(appConfig, tr, "", "79991234567");
    expect(html).toContain('href="https://wa.me/79991234567"');
  });

  it("shows the no-number fallback message when waNumber is empty", () => {
    const html = renderNavbar(appConfig, tr, "", "");
    expect(html).not.toContain("wa.me");
    expect(html).toContain(tr.t("paymentModalNoNumber"));
  });

  it("defaults the empty-cart/empty-wishlist CTA to /catalog", () => {
    const html = renderNavbar(appConfig, tr, "", "");
    expect(html).toContain('href="/catalog" class="drawer-cta"');
    expect(html).not.toContain('href="/crocs" class="drawer-cta"');
  });

  it("points the empty-state CTA at a brand page when emptyStateHref is given", () => {
    const html = renderNavbar(appConfig, tr, "", "", "crocs", "/crocs");
    // Both drawer CTAs (cart + wishlist) should point at /crocs; the mobile
    // menu's "Shop Now" CTA is intentionally NOT category-scoped and stays /catalog.
    expect(html.match(/href="\/crocs" class="drawer-cta"/g)?.length).toBe(2);
  });

  it("pre-fills the search input when searchValue is given", () => {
    const html = renderNavbar(appConfig, tr, "", "", null, "/catalog", "кроссовки");
    expect(html).toContain('value="кроссовки"');
  });

  it("escapes double quotes in searchValue", () => {
    const html = renderNavbar(appConfig, tr, "", "", null, "/catalog", 'foo"bar');
    expect(html).toContain("foo&quot;bar");
    expect(html).not.toContain('value="foo"bar"');
  });

  it("escapes angle brackets in searchValue (XSS regression — reflected via ?q=)", () => {
    const payload = '"><script>alert(1)</script>';
    const html = renderNavbar(appConfig, tr, "", "", null, "/catalog", payload);
    // The raw payload must never appear unescaped in the output.
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain('"><script>');
    // Every dangerous character must be neutralized.
    expect(html).toContain("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapes ampersands and single quotes in searchValue", () => {
    const html = renderNavbar(appConfig, tr, "", "", null, "/catalog", "a&b'c");
    expect(html).toContain("a&amp;b&#39;c");
  });

  it("leaves the search input unfilled when searchValue is omitted", () => {
    const html = renderNavbar(appConfig, tr, "", "");
    expect(html).not.toContain('id="search-input" placeholder="' + tr.t("searchPlaceholder") + '" autocomplete="off" value=');
  });
});

/* ── Integration tests: every migrated page renders one navbar ─────── */

const PAGES_WITH_ACTIVE_KEY = [
  { path: "/crocs", activeHref: "/crocs" },
  { path: "/adidas", activeHref: "/adidas" },
  { path: "/catalog", activeHref: "/catalog" },
  { path: "/about", activeHref: "/about" },
  { path: "/delivery", activeHref: "/delivery" }
];

const ALL_NAVBAR_PAGES = [
  "/", "/crocs", "/adidas", "/catalog", "/about", "/delivery", "/collabs"
];

describe("navbar — consistency across pages", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  for (const path of ALL_NAVBAR_PAGES) {
    it(`${path} renders the standard navbar controls`, async () => {
      const res = await handleRequest(request(path), makeEnv(), {});
      const html = await res.text();
      for (const id of ["search-btn", "wishlist-btn", "cart-btn", "menu-btn", "cart-badge", "wishlist-badge"]) {
        expect(html).toContain(`id="${id}"`);
      }
    });

    it(`${path} links /collabs (not /#collabs) from the nav`, async () => {
      const res = await handleRequest(request(path), makeEnv(), {});
      const html = await res.text();
      expect(html).toContain('href="/collabs"');
      expect(html).not.toContain('href="/#collabs"');
    });
  }

  for (const { path, activeHref } of PAGES_WITH_ACTIVE_KEY) {
    it(`${path} marks its own nav link active, identically on desktop and mobile`, async () => {
      const res = await handleRequest(request(path), makeEnv(), {});
      const html = await res.text();
      const activeLinks = [...html.matchAll(/<a href="([^"]+)"[^>]*class="active"[^>]*>/g)].map((m) => m[1]);
      expect(activeLinks).toEqual([activeHref, activeHref]);
    });
  }

  it("/catalog?brand=adidas highlights Adidas, not Все товары", async () => {
    const res = await handleRequest(request("/catalog?brand=adidas"), makeEnv(), {});
    const html = await res.text();
    const activeLinks = [...html.matchAll(/<a href="([^"]+)"[^>]*class="active"[^>]*>/g)].map((m) => m[1]);
    expect(activeLinks).toEqual(["/adidas", "/adidas"]);
  });

  it("/catalog?brand=crocs 301-redirects to /crocs (SEO canonical), so no in-page active-key logic runs", async () => {
    const res = await handleRequest(request("/catalog?brand=crocs"), makeEnv(), {});
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://kokoc.store/crocs");
  });

  it("crocs.js keeps the empty-cart CTA on /crocs, not /catalog", async () => {
    const res = await handleRequest(request("/crocs"), makeEnv(), {});
    const html = await res.text();
    expect(html.match(/href="\/crocs" class="drawer-cta"/g)?.length).toBe(2);
  });

  it("adidas.js keeps the empty-cart CTA on /adidas, not /catalog", async () => {
    const res = await handleRequest(request("/adidas"), makeEnv(), {});
    const html = await res.text();
    expect(html.match(/href="\/adidas" class="drawer-cta"/g)?.length).toBe(2);
  });

  it("about.js and delivery.js keep the empty-cart CTA on /catalog (no brand context)", async () => {
    for (const path of ["/about", "/delivery"]) {
      const res = await handleRequest(request(path), makeEnv(), {});
      const html = await res.text();
      expect(html.match(/href="\/catalog" class="drawer-cta"/g)?.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("/crocs?q=... pre-fills the search overlay with the query", async () => {
    const res = await handleRequest(request("/crocs?q=пляжные"), makeEnv(), {});
    const html = await res.text();
    expect(html).toContain('value="пляжные"');
  });

  it("/catalog?q=... pre-fills the search overlay with the query", async () => {
    const res = await handleRequest(request("/catalog?q=clog"), makeEnv(), {});
    const html = await res.text();
    expect(html).toContain('value="clog"');
  });

  it("every migrated page renders exactly one <header class=\"navbar\">", async () => {
    for (const path of ALL_NAVBAR_PAGES) {
      const res = await handleRequest(request(path), makeEnv(), {});
      const html = await res.text();
      expect(html.match(/<header class="navbar"/g)?.length).toBe(1);
    }
  });
});

/* ── /minigame: intentionally has NO standard navbar, only a mini-header ── */

describe("navbar — /minigame (intentionally excluded)", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("does not render the standard site navbar", async () => {
    const res = await handleRequest(request("/minigame"), makeEnv(), {});
    const html = await res.text();
    expect(html).not.toContain('<header class="navbar"');
    for (const id of ["search-btn", "wishlist-btn", "cart-btn", "menu-btn", "cart-badge", "wishlist-badge"]) {
      expect(html).not.toContain(`id="${id}"`);
    }
  });

  it("renders a minimal mini-header with only a welcome link and a shop link", async () => {
    const res = await handleRequest(request("/minigame"), makeEnv(), {});
    const html = await res.text();
    expect(html).toContain('<header class="mini-header">');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/catalog" class="shop-link"');
  });

  it("translates the mini-header links via i18n (ru vs en)", async () => {
    const resRu = await handleRequest(request("/minigame?lang=ru"), makeEnv(), {});
    const htmlRu = await resRu.text();
    expect(htmlRu).toContain("Назад");
    expect(htmlRu).toContain("Каталог");

    const resEn = await handleRequest(request("/minigame?lang=en"), makeEnv(), {});
    const htmlEn = await resEn.text();
    expect(htmlEn).toContain("Back");
    expect(htmlEn).toContain("Catalog");
  });
});

/* ── Known gap: product.js does not yet share the navbar module ────── */

describe("navbar — product.js (not yet migrated)", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("still renders its own independent navbar markup with the same control ids", async () => {
    // This test documents current behavior, not an endorsement of it: product.js
    // has its own copy of the navbar HTML/CSS/JS rather than calling renderNavbar().
    // If this test starts failing because product.js was migrated, delete it and
    // add product.js to PAGES_WITH_ACTIVE_KEY / ALL_NAVBAR_PAGES above instead.
    const res = await handleRequest(request("/product/classic-clog"), makeEnv(), {});
    const html = await res.text();
    for (const id of ["search-btn", "wishlist-btn", "cart-btn", "menu-btn"]) {
      expect(html).toContain(`id="${id}"`);
    }
    // No nav link is active on the product page today — documenting, not endorsing.
    expect(html).not.toMatch(/<nav class="desktop-nav">[\s\S]*?class="active"[\s\S]*?<\/nav>/);
  });
});
