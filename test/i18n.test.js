import { describe, expect, it } from "vitest";
import {
  normalizeLocale,
  getLocaleFromRequest,
  localeHeaders,
  i18n,
  pluralItems,
  LOCALE_COOKIE,
  DEFAULT_LOCALE,
} from "../src/lib/i18n.js";

const req = (url, headers = {}, cf) => new Request(url, { headers, ...(cf ? { cf } : {}) });

// @cloudflare/vitest-pool-workers never populates request.cf, so any test
// that relies on the "no ?lang=, no cookie" geo-detection fallback must pass
// cf explicitly to exercise that branch — otherwise it silently falls
// through to the country === "" → "en" case instead of "ru".
const RU_CF = { country: "RU" };

/* ── normalizeLocale ──────────────────────────────────────── */

describe("normalizeLocale", () => {
  it("returns valid locales as-is", () => {
    expect(normalizeLocale("ru")).toBe("ru");
    expect(normalizeLocale("en")).toBe("en");
  });

  it("falls back to DEFAULT_LOCALE for unknown values", () => {
    expect(normalizeLocale("fr")).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale("")).toBe(DEFAULT_LOCALE);
  });
});

/* ── getLocaleFromRequest ─────────────────────────────────── */

describe("getLocaleFromRequest", () => {
  it("reads locale from ?lang= query param and flags cookie write", () => {
    const result = getLocaleFromRequest(req("https://kokoc.store/?lang=en"));
    expect(result).toEqual({ locale: "en", shouldSetCookie: true });
  });

  it("reads locale from ?lang=ru and flags cookie write", () => {
    const result = getLocaleFromRequest(req("https://kokoc.store/?lang=ru"));
    expect(result).toEqual({ locale: "ru", shouldSetCookie: true });
  });

  it("ignores unknown ?lang= value and falls back to geo-detected locale (sets cookie)", () => {
    const result = getLocaleFromRequest(req("https://kokoc.store/?lang=fr", {}, RU_CF));
    expect(result.locale).toBe(DEFAULT_LOCALE);
    expect(result.shouldSetCookie).toBe(true);
  });

  it("reads locale from cookie when no query param", () => {
    const result = getLocaleFromRequest(
      req("https://kokoc.store/", { cookie: `${LOCALE_COOKIE}=en` })
    );
    expect(result).toEqual({ locale: "en", shouldSetCookie: false });
  });

  it("handles multiple cookies and picks the right one", () => {
    const result = getLocaleFromRequest(
      req("https://kokoc.store/", {
        cookie: `kokoc_sid=abc123; ${LOCALE_COOKIE}=en; other=xyz`,
      })
    );
    expect(result.locale).toBe("en");
  });

  it("falls back to geo-detected DEFAULT_LOCALE when no param and no cookie (Russian visitor)", () => {
    const result = getLocaleFromRequest(req("https://kokoc.store/", {}, RU_CF));
    expect(result).toEqual({ locale: DEFAULT_LOCALE, shouldSetCookie: true });
  });

  it("falls back to 'en' when no param, no cookie, and no Cloudflare geo signal (e.g. local dev/tests)", () => {
    const result = getLocaleFromRequest(req("https://kokoc.store/"));
    expect(result).toEqual({ locale: "en", shouldSetCookie: true });
  });

  it("query param takes priority over cookie", () => {
    const result = getLocaleFromRequest(
      req("https://kokoc.store/?lang=en", { cookie: `${LOCALE_COOKIE}=ru` })
    );
    expect(result).toEqual({ locale: "en", shouldSetCookie: true });
  });
});

/* ── localeHeaders ────────────────────────────────────────── */

describe("localeHeaders", () => {
  it("always includes Vary: Cookie", () => {
    const headers = localeHeaders({ locale: "ru", shouldSetCookie: false });
    expect(headers.vary).toBe("Cookie");
  });

  it("sets Set-Cookie when shouldSetCookie is true", () => {
    const headers = localeHeaders({ locale: "en", shouldSetCookie: true });
    expect(headers["Set-Cookie"]).toContain(`${LOCALE_COOKIE}=en`);
    expect(headers["Set-Cookie"]).toContain("Path=/");
    expect(headers["Set-Cookie"]).toContain("SameSite=Lax");
    expect(headers["Set-Cookie"]).toContain("Max-Age=31536000");
  });

  it("does not set Set-Cookie when shouldSetCookie is false", () => {
    const headers = localeHeaders({ locale: "ru", shouldSetCookie: false });
    expect(headers["Set-Cookie"]).toBeUndefined();
  });

  it("normalizes invalid locale in Set-Cookie to default", () => {
    const headers = localeHeaders({ locale: "xx", shouldSetCookie: true });
    expect(headers["Set-Cookie"]).toContain(`${LOCALE_COOKIE}=${DEFAULT_LOCALE}`);
  });
});

/* ── i18n ─────────────────────────────────────────────────── */

describe("i18n", () => {
  it("returns correct translation for ru", () => {
    const tr = i18n("ru");
    expect(tr.locale).toBe("ru");
    expect(tr.t("navShop")).toBe("Магазин");
    expect(tr.t("cart")).toBe("Корзина");
  });

  it("returns correct translation for en", () => {
    const tr = i18n("en");
    expect(tr.locale).toBe("en");
    expect(tr.t("navShop")).toBe("Shop");
    expect(tr.t("cart")).toBe("Cart");
  });

  it("falls back to ru for unknown locale", () => {
    const tr = i18n("de");
    expect(tr.locale).toBe("ru");
    expect(tr.t("navShop")).toBe("Магазин");
  });

  it("falls back to key name for unknown key", () => {
    const tr = i18n("ru");
    expect(tr.t("nonExistentKey")).toBe("nonExistentKey");
  });
});

/* ── pluralItems ──────────────────────────────────────────── */

describe("pluralItems (ru)", () => {
  const tr = i18n("ru");

  it.each([
    [1, "1 товар"],
    [2, "2 товара"],
    [3, "3 товара"],
    [4, "4 товара"],
    [5, "5 товаров"],
    [11, "11 товаров"],
    [12, "12 товаров"],
    [21, "21 товар"],
    [22, "22 товара"],
    [100, "100 товаров"],
    [101, "101 товар"],
  ])("count %i → %s", (count, expected) => {
    expect(pluralItems(count, tr)).toBe(expected);
  });
});

describe("pluralItems (en)", () => {
  const tr = i18n("en");

  it.each([
    [1, "1 item"],
    [2, "2 items"],
    [5, "5 items"],
    [21, "21 items"],
  ])("count %i → %s", (count, expected) => {
    expect(pluralItems(count, tr)).toBe(expected);
  });
});
