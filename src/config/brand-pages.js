/**
 * brand-pages.js — per-brand configuration for the shared catalog page.
 *
 * Background
 * ----------
 * /catalog, /crocs and /adidas were three near-identical 1200-line files.
 * A diff of crocs.js against adidas.js showed ~84% of lines identical, and
 * the entire markup section (roughly lines 400-700) was byte-for-byte the
 * same. Everything that genuinely differed was data: the H1, the intro
 * copy, the filter chips, the size-guide table, and the FAQ entries.
 *
 * This matters beyond tidiness. The XSS that test/xss-regression.test.js
 * guards against had to be fixed in three places at once, and that suite
 * still runs the same assertions three times over. The next bug in this
 * code path would need the same triple fix — and one day a copy gets
 * missed. That is exactly how the original escaping bug described in
 * lib/html.js came about.
 *
 * Each entry below is pure data. Adding a fourth brand page is now a
 * config object, not another 1200-line file.
 */

/**
 * @typedef {Object} SizeGuideTable
 * @property {string[]} columns  — table headers, e.g. ["US","UK","EU","CM"]
 * @property {string[][]} rows   — each row must match columns.length
 * @property {string} [labelKey] — i18n key for the table's aria-label
 * @property {string} [label]    — literal label when no i18n key fits
 */

/** Crocs adult sizing (US M/W scale) — mirrors product.js crocsSizeGuide. */
const CROCS_ADULT_SIZES = [
  ["M3 W5",   "34–35", "21"],
  ["M4 W6",   "36–37", "22"],
  ["M5 W7",   "37–38", "23"],
  ["M6 W8",   "38–39", "24"],
  ["M7 W9",   "39–40", "25"],
  ["M8 W10",  "41–42", "26"],
  ["M9 W11",  "42–43", "27"],
  ["M10 W12", "43–44", "28"],
  ["M11",     "45–46", "29"]
];

/** Crocs kids sizing (US C/J scale) — mirrors product.js crocsKidsSizeGuide. */
const CROCS_KIDS_SIZES = [
  ["C11", "28–29", "17"],
  ["C12", "29–30", "18"],
  ["C13", "30–31", "19"],
  ["J1",  "32–33", "19,5"],
  ["J2",  "33–34", "20"],
  ["J3",  "34–35", "21"]
];


/**
 * Apparel sizing charts, shared by any brand that sells clothing.
 *
 * These were previously defined inline in adidas.js only — crocs.js had no
 * equivalent, which is why the shared page module had to be built from the
 * Adidas superset rather than the Crocs version. Brands opt in via
 * `hasApparel: true`.
 *
 * Columns are bilingual: `cols` (ru) / `colsEn` (en), selected at runtime.
 */
export const APPAREL_SIZE_GUIDES = {
  women_top: {
    cols: ["Size", "Обхват груди, см", "Обхват талии, см", "Обхват бёдер, см"],
    colsEn: ["Size", "Chest, cm", "Waist, cm", "Hip, cm"],
    rows: [
      ["XS", "78", "64", "86"],
      ["S",  "82", "68", "90"],
      ["M",  "86", "72", "94"],
      ["L",  "92", "78", "100"],
      ["XL", "98", "86", "106"],
    ],
  },
  men_top: {
    cols: ["Size", "Обхват груди, см", "Обхват талии, см", "Обхват бёдер, см"],
    colsEn: ["Size", "Chest, cm", "Waist, cm", "Hip, cm"],
    rows: [
      ["S",   "90",  "72–76",  "89"],
      ["M",   "95",  "77–81",  "94"],
      ["L",   "100", "82–86",  "99"],
      ["XL",  "106", "87–93",  "105"],
      ["2XL", "112", "94–100", "111"],
    ],
  },
  women_bottom: {
    cols: ["Size", "Обхват талии, см", "Обхват бёдер, см", "Длина по внутр. шву, см"],
    colsEn: ["Size", "Waist, cm", "Hip, cm", "Inseam, cm"],
    rows: [
      ["XS", "64", "86",  "74"],
      ["S",  "68", "90",  "74.5"],
      ["M",  "72", "94",  "74.5"],
      ["L",  "78", "100", "75"],
      ["XL", "86", "106", "75"],
    ],
  },
  men_bottom: {
    cols: ["Size", "Обхват талии, см", "Обхват бёдер, см", "Длина по внутр. шву, см"],
    colsEn: ["Size", "Waist, cm", "Hip, cm", "Inseam, cm"],
    rows: [
      ["S",   "72–76",  "89",  "78"],
      ["M",   "77–81",  "94",  "78"],
      ["L",   "82–86",  "99",  "78.5"],
      ["XL",  "87–93",  "105", "79"],
      ["2XL", "94–100", "111", "79.5"],
    ],
  },
};

/** Label for the apparel chart, per locale. */
export const APPAREL_SIZE_GUIDE_LABEL = {
  ru: "Таблица размеров (одежда)",
  en: "Apparel Size Guide"
};

/**
 * Brand page definitions.
 *
 * `brand` is the exact value stored in products.brand in D1 — it is used
 * as a bound query parameter, never interpolated into SQL.
 */
export const BRAND_PAGES = {
  crocs: {
    key: "crocs",
    brand: "Crocs",
    path: "/crocs",
    navKey: "crocs",
    h1Key: "crocsPageH1",
    introKey: "crocsIntro",
    faqTitleKey: "crocsFaqTitle",
    seoTitleKey: "crocsSeoTitle",
    seoDescriptionKey: "crocsSeoDescription",
    breadcrumbTitleKey: "crocsPageTitle",
    introClass: "crocs-intro",
    // FAQ entries follow a <brand>FaqQ1..N / <brand>FaqA1..N key pattern.
    faqKeyPrefix: "crocsFaq",
    faqCount: 4,
    // Column header shown above the brand's own sizing column.
    sizeColumnLabel: "Crocs",

    tags: [
      { key: "",        labelKey: "all" },
      { key: "new",     labelKey: "new" },
      { key: "hit",     labelKey: "hit" },
      { key: "limited", labelKey: "limited" },
      { key: "sale",    labelKey: "sale" },
      { key: "kids",    labelKey: "kids" },
      { key: "jibbitz", label: "Jibbitz" }
    ],

    // Crocs is the only brand with a second (kids) size chart, selected at
    // runtime from the product's `kids` tag.
    sizeGuide: {
      columns: ["US", "EU", "CM"],
      rows: CROCS_ADULT_SIZES,
      labelKey: "crocsSizeGuide"
    },
    kidsSizeGuide: {
      columns: ["US", "EU", "CM"],
      rows: CROCS_KIDS_SIZES,
      labelKey: "crocsKidsSizeGuide"
    },
    hasApparel: false
  },

  adidas: {
    key: "adidas",
    brand: "Adidas Originals",
    path: "/adidas",
    navKey: "adidas",
    h1Key: "adidasPageH1",
    introKey: "adidasIntro",
    faqTitleKey: "adidasFaqTitle",
    seoTitleKey: "adidasSeoTitle",
    seoDescriptionKey: "adidasSeoDescription",
    breadcrumbTitleKey: "adidasTitle",
    introClass: "adidas-intro",
    faqKeyPrefix: "adidasFaq",
    faqCount: 4,
    sizeColumnLabel: "Adidas",

    tags: [
      { key: "",         labelKey: "all" },
      { key: "sneakers", label: { ru: "Кроссовки", en: "Sneakers" } },
      { key: "ballet",   label: { ru: "Балетки",   en: "Ballet flats" } },
      { key: "apparel",  label: { ru: "Одежда",    en: "Apparel" } },
      { key: "limited",  labelKey: "limited" },
      { key: "sale",     labelKey: "sale" }
    ],

    sizeGuide: {
      columns: ["US", "UK", "EU", "CM"],
      rows: [
        ["US 4",   "UK 3.5", "36",   "22.1"],
        ["US 4.5", "UK 4",   "36.5", "22.5"],
        ["US 5",   "UK 4.5", "37",   "22.9"],
        ["US 5.5", "UK 5",   "38",   "23.3"],
        ["US 6",   "UK 5.5", "38.5", "23.8"],
        ["US 6.5", "UK 6",   "39",   "24.2"],
        ["US 7",   "UK 6.5", "40",   "24.6"],
        ["US 7.5", "UK 7",   "40.5", "25.1"],
        ["US 8",   "UK 7.5", "41",   "25.5"],
        ["US 8.5", "UK 8",   "42",   "25.9"],
        ["US 9",   "UK 8.5", "42.5", "26.3"],
        ["US 9.5", "UK 9",   "43",   "26.8"],
        ["US 10",  "UK 9.5", "44",   "27.2"],
        ["US 10.5","UK 10",  "44.5", "27.6"],
        ["US 11",  "UK 10.5","45",   "28.1"]
      ],
      label: { ru: "Таблица размеров Adidas", en: "Adidas Size Guide" }
    },
    kidsSizeGuide: null,
    hasApparel: true
  }
};

/**
 * Resolve a label that may be an i18n key, a literal string, or a
 * per-locale object. Keeps the page template free of this branching.
 *
 * @param {{ labelKey?: string, label?: string|Record<string,string> }} entry
 * @param {{ t: (k: string) => string }} tr
 * @param {string} locale
 */
export function resolveLabel(entry, tr, locale) {
  if (entry.labelKey) return tr.t(entry.labelKey);
  if (typeof entry.label === "string") return entry.label;
  if (entry.label && typeof entry.label === "object") {
    return entry.label[locale] ?? entry.label.en ?? Object.values(entry.label)[0] ?? "";
  }
  return "";
}

/** @param {string} key */
export function getBrandPage(key) {
  return BRAND_PAGES[key] ?? null;
}
