import { describe, expect, it } from "vitest";
import { renderCrocsPage } from "../src/pages/crocs.js";
import { renderAdidasPage } from "../src/pages/adidas.js";
import { renderBrandCatalogPage } from "../src/pages/brand-catalog.js";
import { BRAND_PAGES, resolveLabel, APPAREL_SIZE_GUIDES } from "../src/config/brand-pages.js";
import { appConfig } from "../src/config/app.js";

/**
 * brand-catalog.test.js
 *
 * /crocs and /adidas were two ~1250-line files that were ~84% identical.
 * They are now one implementation (pages/brand-catalog.js) plus per-brand
 * config. These tests pin the behaviour that consolidation had to preserve,
 * and the per-brand differences that must NOT leak across.
 */

const baseData = (overrides = {}) => ({
  products: [{
    slug: "p", title: "P", description: "<p>d</p>",
    image: "/i.png", price: "1 ₽", badge: "new", tags: [],
    gender: "women", apparelType: "top"
  }],
  total: 1, limit: 12, offset: 0, sort: "newest", tag: null, q: null,
  ...overrides
});

const crocs = (locale = "ru", data = baseData()) =>
  renderCrocsPage(appConfig, data, locale, "79990000000", "nonce");
const adidas = (locale = "ru", data = baseData()) =>
  renderAdidasPage(appConfig, data, locale, "79990000000", "nonce");

describe("brand pages render from shared module", () => {
  it("both brands produce a full HTML document", () => {
    for (const html of [crocs(), adidas()]) {
      expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
      expect(html).toContain("</html>");
    }
  });

  it("each brand keeps its own canonical URL", () => {
    expect(crocs()).toContain('href="https://kokoc.store/crocs"');
    expect(adidas()).toContain('href="https://kokoc.store/adidas"');
  });

  it("each brand keeps its own H1", () => {
    expect(crocs()).not.toBe(adidas());
    const h1 = html => html.match(/<h1[^>]*>(.*?)<\/h1>/)[1];
    expect(h1(crocs())).not.toBe(h1(adidas()));
  });
});

describe("per-brand config does not leak across pages", () => {
  it("Jibbitz chip appears only on the Crocs page", () => {
    expect(crocs()).toContain("Jibbitz");
    expect(adidas()).not.toContain(">Jibbitz<");
  });

  it("Crocs gets a kids size chart; Adidas does not", () => {
    expect(crocs()).toContain("HAS_KIDS_GUIDE = true");
    expect(adidas()).toContain("HAS_KIDS_GUIDE = false");
  });

  it("Adidas keeps apparel size charts; Crocs disables them", () => {
    // Regression guard: the shared module was first built from crocs.js,
    // which silently dropped Adidas' apparel sizing entirely.
    const a = adidas();
    expect(a).toContain("women_top");
    expect(a).toContain("men_bottom");
    expect(crocs()).toContain("SIZE_GUIDE_APPAREL = null");
  });

  it("size chart headers match the column count of their rows", () => {
    // The old crocs.js client hardcoded 4 headers (US/UK/EU/CM) for adult
    // rows that only carry 3 values, producing an empty trailing cell.
    for (const [html, brand] of [[crocs(), BRAND_PAGES.crocs], [adidas(), BRAND_PAGES.adidas]]) {
      const cols = JSON.parse(html.match(/const SIZE_GUIDE_COLS = (\[.*?\]);/)[1]);
      expect(cols.length).toBe(brand.sizeGuide.rows[0].length);
      expect(cols.length).toBe(brand.sizeGuide.columns.length);
    }
  });
});

describe("localisation still works through the shared module", () => {
  it("renders different copy per locale for both brands", () => {
    expect(crocs("ru")).not.toBe(crocs("en"));
    expect(adidas("ru")).not.toBe(adidas("en"));
    expect(crocs("en")).toContain('lang="en"');
    expect(adidas("ru")).toContain('lang="ru"');
  });
});

describe("config helpers", () => {
  const tr = { t: k => `T:${k}` };

  it("resolveLabel handles i18n keys, literals and per-locale objects", () => {
    expect(resolveLabel({ labelKey: "all" }, tr, "ru")).toBe("T:all");
    expect(resolveLabel({ label: "Jibbitz" }, tr, "ru")).toBe("Jibbitz");
    expect(resolveLabel({ label: { ru: "Кроссовки", en: "Sneakers" } }, tr, "en")).toBe("Sneakers");
    expect(resolveLabel({ label: { ru: "Кроссовки", en: "Sneakers" } }, tr, "ru")).toBe("Кроссовки");
  });

  it("falls back to English for an unknown locale", () => {
    expect(resolveLabel({ label: { ru: "А", en: "B" } }, tr, "de")).toBe("B");
  });

  it("every brand config is internally consistent", () => {
    for (const [key, b] of Object.entries(BRAND_PAGES)) {
      expect(b.key).toBe(key);
      expect(b.path.startsWith("/")).toBe(true);
      expect(b.sizeGuide.rows.length).toBeGreaterThan(0);
      // Every row must match the declared column count.
      for (const row of b.sizeGuide.rows) {
        expect(row.length).toBe(b.sizeGuide.columns.length);
      }
      if (b.kidsSizeGuide) {
        for (const row of b.kidsSizeGuide.rows) {
          expect(row.length).toBe(b.kidsSizeGuide.columns.length);
        }
      }
      expect(b.faqCount).toBeGreaterThan(0);
    }
  });

  it("apparel charts cover every gender × garment combination", () => {
    expect(Object.keys(APPAREL_SIZE_GUIDES).sort())
      .toEqual(["men_bottom", "men_top", "women_bottom", "women_top"]);
    for (const g of Object.values(APPAREL_SIZE_GUIDES)) {
      expect(g.cols.length).toBe(g.colsEn.length);
      for (const row of g.rows) expect(row.length).toBe(g.cols.length);
    }
  });
});

describe("adding a brand requires no new page module", () => {
  it("renders a page for an ad-hoc brand config", () => {
    const custom = {
      ...BRAND_PAGES.crocs,
      key: "test", brand: "TestBrand", path: "/test", navKey: "catalog",
      sizeColumnLabel: "TestBrand"
    };
    const html = renderBrandCatalogPage(custom, appConfig, baseData(), "ru", "", "n");
    expect(html).toContain('href="https://kokoc.store/test"');
    expect(html).toContain("TestBrand");
  });
});
