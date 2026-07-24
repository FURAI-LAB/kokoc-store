import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest } from "../src/server.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);

describe("www → apex redirect", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("301-redirects the homepage", async () => {
    const res = await handleRequest(
      new Request("https://www.kokoc.store/"),
      makeEnv(),
      {}
    );
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://kokoc.store/");
  });

  it("preserves path and query string", async () => {
    const res = await handleRequest(
      new Request("https://www.kokoc.store/catalog?tag=new"),
      makeEnv(),
      {}
    );
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://kokoc.store/catalog?tag=new");
  });

  it("does not redirect requests already on the apex domain", async () => {
    const res = await handleRequest(request("/"), makeEnv(), {});
    expect(res.status).toBe(200);
  });
});

describe("unhandled errors → safe 500", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("returns a controlled 500 instead of throwing when a downstream call fails", async () => {
    const brokenEnv = makeEnv({
      DB: {
        prepare: () => {
          throw new Error("simulated D1 outage");
        }
      }
    });

    const res = await handleRequest(request("/product/classic-clog"), brokenEnv, {});

    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("public server routes", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("renders the catalog page with active products", async () => {
    const response = await handleRequest(
      request("/catalog?tag=classic&sort=price_asc"),
      makeEnv(),
      {}
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Classic Clog");
    expect(html).not.toContain("Hidden Clog");
  });

  it("renders a product page by slug", async () => {
    const response = await handleRequest(request("/product/classic-clog"), makeEnv(), {});
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Classic Clog");
    expect(html).toContain("M5 W7");
  });

  it("renders the HTML 404 page for a missing product page", async () => {
    const response = await handleRequest(request("/product/nope"), makeEnv(), {});
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("/images/404/404-desktop.jpg");
  });

  it("falls through missing assets to the HTML route 404", async () => {
    const response = await handleRequest(request("/missing-page"), makeEnv(), {});
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("/images/404/404-desktop.jpg");
  });
});

describe("i18n — language switching", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  // ── ?lang=en переключает страницу на английский ──────────────

  it("renders landing in English when ?lang=en is passed", async () => {
    const response = await handleRequest(request("/?lang=en"), makeEnv(), {});
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Shop");        // navShop EN
    expect(html).toContain("lang=\"en\""); // <html lang="en">
    expect(html).not.toContain("Магазин"); // navShop RU отсутствует
  });

  it("renders catalog in English when ?lang=en is passed", async () => {
    const response = await handleRequest(request("/catalog?lang=en"), makeEnv(), {});
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Add to cart");     // addToCart EN
    expect(html).toContain("lang=\"en\"");
    expect(html).not.toContain("Добавить в корзину"); // addToCart RU отсутствует
  });

  it("renders product page in English when ?lang=en is passed", async () => {
    const response = await handleRequest(
      request("/product/classic-clog?lang=en"),
      makeEnv(),
      {}
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("lang=\"en\"");
    expect(html).toContain("Add to cart");
    expect(html).not.toContain("Добавить в корзину");
  });

  // ── ?lang=en выставляет Set-Cookie ───────────────────────────

  it("sets kokoc_lang cookie when ?lang=en is passed", async () => {
    const response = await handleRequest(request("/?lang=en"), makeEnv(), {});
    const cookie = response.headers.get("set-cookie");

    expect(cookie).toContain("kokoc_lang=en");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=31536000");
  });

  it("sets kokoc_lang cookie when ?lang=ru is passed", async () => {
    const response = await handleRequest(request("/?lang=ru"), makeEnv(), {});
    const cookie = response.headers.get("set-cookie");

    expect(cookie).toContain("kokoc_lang=ru");
  });

  it("sets Set-Cookie on first visit with no ?lang= and no cookie (geo-detected locale gets persisted)", async () => {
    const response = await handleRequest(request("/", { cf: { country: "RU" } }), makeEnv(), {});

    expect(response.headers.get("set-cookie")).toContain("kokoc_lang=ru");
  });

  // ── cookie сохраняет язык без query param ────────────────────

  it("renders landing in English from cookie without ?lang=", async () => {
    const response = await handleRequest(
      request("/", { headers: { cookie: "kokoc_lang=en" } }),
      makeEnv(),
      {}
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("lang=\"en\"");
    expect(html).toContain("Shop");
    expect(html).not.toContain("Магазин");
  });

  it("renders catalog in Russian from cookie", async () => {
    const response = await handleRequest(
      request("/catalog", { headers: { cookie: "kokoc_lang=ru" } }),
      makeEnv(),
      {}
    );
    const html = await response.text();

    expect(html).toContain("lang=\"ru\"");
    // UI JSON содержит русский перевод (инжектируется в <script>)
    expect(html).toContain('"addToCart":"Добавить в корзину"');
    // Английские nav-ссылки отсутствуют в разметке
    expect(html).not.toContain(">Shop<");
  });

  // ── ?lang= перебивает cookie ─────────────────────────────────

  it("query param overrides cookie — switches from ru cookie to en", async () => {
    const response = await handleRequest(
      request("/?lang=en", { headers: { cookie: "kokoc_lang=ru" } }),
      makeEnv(),
      {}
    );
    const html = await response.text();

    expect(html).toContain("lang=\"en\"");
    expect(response.headers.get("set-cookie")).toContain("kokoc_lang=en");
  });

  // ── Vary: Cookie присутствует на всех страницах ──────────────

  it("includes Vary: Cookie on landing page", async () => {
    const response = await handleRequest(request("/"), makeEnv(), {});
    expect(response.headers.get("vary")).toContain("Cookie");
  });

  it("includes Vary: Cookie on catalog page", async () => {
    const response = await handleRequest(request("/catalog"), makeEnv(), {});
    expect(response.headers.get("vary")).toContain("Cookie");
  });

  it("includes Vary: Cookie on product page", async () => {
    const response = await handleRequest(request("/product/classic-clog"), makeEnv(), {});
    expect(response.headers.get("vary")).toContain("Cookie");
  });

  // ── fallback: без param и cookie — русский по умолчанию ──────

  it("defaults to Russian when no lang param and no cookie, for a visitor geo-located in Russia", async () => {
    const response = await handleRequest(request("/catalog", { cf: { country: "RU" } }), makeEnv(), {});
    const html = await response.text();

    expect(html).toContain("lang=\"ru\"");
    expect(html).toContain("Добавить в корзину");
  });
});

describe("security — reflected XSS via ?q= (search box echo)", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  const xssPayload = '"><script>alert(1)</script>';

  for (const path of ["/catalog", "/crocs", "/adidas"]) {
    it(`does not reflect an unescaped <script> payload from ?q= on ${path}`, async () => {
      const response = await handleRequest(
        request(`${path}?q=${encodeURIComponent(xssPayload)}`),
        makeEnv(),
        {}
      );
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).not.toContain("<script>alert(1)</script>");
      expect(html).not.toContain('"><script>');
    });
  }
});
