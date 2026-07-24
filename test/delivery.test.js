import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest } from "../src/server.js";
import { renderDeliveryPage } from "../src/pages/delivery.js";
import { appConfig } from "../src/config/app.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";

const req = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Routing
// ─────────────────────────────────────────────────────────────────────────────

describe("/delivery route", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("returns 200", async () => {
    const res = await handleRequest(req("/delivery"), makeEnv(), {});
    expect(res.status).toBe(200);
  });

  it("returns text/html content-type", async () => {
    const res = await handleRequest(req("/delivery"), makeEnv(), {});
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("is an exact-match route — /delivery/anything returns 404", async () => {
    const res = await handleRequest(req("/delivery/moscow"), makeEnv(), {});
    expect(res.status).toBe(404);
  });

  it("sets cache-control: public, max-age=300, stale-while-revalidate=3600", async () => {
    const res = await handleRequest(req("/delivery"), makeEnv(), {});
    const cc = res.headers.get("cache-control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=300");
    expect(cc).toContain("stale-while-revalidate=3600");
  });

  it("sets Vary: Cookie so CDN caches per locale", async () => {
    const res = await handleRequest(req("/delivery"), makeEnv(), {});
    expect(res.headers.get("vary")).toContain("Cookie");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Security headers
// ─────────────────────────────────────────────────────────────────────────────

describe("/delivery security headers", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("sets X-Content-Type-Options: nosniff", async () => {
    const res = await handleRequest(req("/delivery"), makeEnv(), {});
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("sets X-Frame-Options: DENY", async () => {
    const res = await handleRequest(req("/delivery"), makeEnv(), {});
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("sets Strict-Transport-Security", async () => {
    const res = await handleRequest(req("/delivery"), makeEnv(), {});
    expect(res.headers.get("strict-transport-security")).toContain("max-age=31536000");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. HTML structure — unit tests on renderDeliveryPage() directly
// ─────────────────────────────────────────────────────────────────────────────

describe("renderDeliveryPage — Russian (default)", () => {
  let html;
  beforeEach(() => { html = renderDeliveryPage(appConfig, "ru"); });

  // Document skeleton
  it("outputs a valid HTML5 skeleton", () => {
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("<head>");
    expect(html).toContain("<body>");
    expect(html).toContain("</html>");
  });

  it("sets lang='ru'", () => {
    expect(html).toContain('<html lang="ru"');
  });

  it("includes the domain in <title>", () => {
    expect(html).toContain(appConfig.domain);
  });

  it("includes favicon links", () => {
    expect(html).toContain("favsmall.png");
    expect(html).toContain("favbig.jpg");
  });

  // Hero
  it("renders the hero headline in Russian", () => {
    expect(html).toContain("Курьер СДЭК привезёт прямо до двери");
  });

  // Does NOT use CDEK pickup-point widget — courier delivery only
  it("does NOT embed a CDEK pickup-point iframe", () => {
    expect(html).not.toContain("widget.cdek.ru");
    expect(html).not.toContain("ISDEKWidjet");
    expect(html).not.toContain("widjet.min.js");
  });

  // Courier info section
  it("renders the courier info section in Russian", () => {
    expect(html).toContain("Курьерская доставка");
    expect(html).toContain("Доставка до двери");
    expect(html).toContain("Сроки доставки");
    expect(html).toContain("Удобное получение");
  });

  // Hint below courier section
  it("renders the hint text below the courier section in Russian", () => {
    expect(html).toContain("при оформлении заказа");
    expect(html).toContain("СДЭК");
  });

  // 4-step delivery flow
  it("renders all 4 step numbers", () => {
    ["01", "02", "03", "04"].forEach(n => expect(html).toContain(n));
  });

  it("renders the 4 step titles in Russian", () => {
    expect(html).toContain("Заказ обрабатывается");
    expect(html).toContain("Отправка СДЭК");
    expect(html).toContain("Курьер в пути");
    expect(html).toContain("Доставка до двери");
  });

  // FAQ
  it("renders the FAQ section title in Russian", () => {
    expect(html).toContain("Вопросы о доставке");
  });

  it("renders all 4 FAQ questions in Russian", () => {
    expect(html).toContain("Сколько стоит доставка?");
    expect(html).toContain("Как скоро приедет курьер?");
    expect(html).toContain("Можно ли изменить адрес доставки?");
    expect(html).toContain("Что делать, если меня не будет дома?");
  });

  it("FAQ items have aria-expanded attributes for accessibility", () => {
    expect(html).toContain('aria-expanded="false"');
  });

  it("FAQ JS toggles the open class and aria-expanded", () => {
    expect(html).toContain("classList.add('open')");
    expect(html).toContain("setAttribute('aria-expanded'");
  });

  // Navbar
  it("navbar brand links to /", () => {
    expect(html).toMatch(/class="brand"[\s\S]{0,50}href="\/"/);
  });

  it("desktop-nav contains a /delivery link", () => {
    expect(html).toMatch(/class="desktop-nav"[\s\S]{0,300}href="\/delivery"/);
  });

  it("mobile-nav drawer contains a /delivery link", () => {
    expect(html).toMatch(/class="mobile-nav"[\s\S]{0,300}href="\/delivery"/);
  });

  it("navbar has Russian labels", () => {
    expect(html).toContain("В магазин");
    expect(html).toContain("Коллабы");
  });

  // Footer
  it("renders footer credit", () => {
    expect(html).toContain("stay chill");
    expect(html).toContain("FURAI LAB");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. HTML structure — English locale
// ─────────────────────────────────────────────────────────────────────────────

describe("renderDeliveryPage — English", () => {
  let html;
  beforeEach(() => { html = renderDeliveryPage(appConfig, "en"); });

  it("sets lang='en'", () => {
    expect(html).toContain('<html lang="en"');
    expect(html).not.toContain('<html lang="ru"');
  });

  it("renders the hero headline in English", () => {
    expect(html).toContain("CDEK courier delivers straight to your door");
  });

  it("renders the courier info section in English", () => {
    expect(html).toContain("Courier Delivery");
    expect(html).toContain("Door-to-door");
    expect(html).toContain("Delivery time");
    expect(html).toContain("Convenient receipt");
  });

  it("renders the hint text in English", () => {
    expect(html).toContain("at checkout");
  });

  it("renders all 4 step titles in English", () => {
    expect(html).toContain("Order processed");
    expect(html).toContain("Shipped via CDEK");
    expect(html).toContain("Courier en route");
    expect(html).toContain("Delivered to door");
  });

  it("renders all 4 FAQ questions in English", () => {
    expect(html).toContain("How much does delivery cost?");
    expect(html).toContain("When will the courier arrive?");
    expect(html).toContain("Can I change my delivery address?");
    expect(html).toContain("What if I'm not home?");
  });

  it("renders navbar in English", () => {
    expect(html).toContain("Shop");
    expect(html).toContain("Collabs");
  });

  it("does NOT contain Russian-only strings", () => {
    expect(html).not.toContain("Магазин");
    expect(html).not.toContain("Заказ обрабатывается");
    expect(html).not.toContain("Сколько стоит доставка?");
    expect(html).not.toContain("Курьерская доставка");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. i18n — locale detection via server (cookie + query param)
// ─────────────────────────────────────────────────────────────────────────────

describe("/delivery i18n", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("defaults to Russian without lang param or cookie, for a visitor geo-located in Russia", async () => {
    const res = await handleRequest(req("/delivery", { cf: { country: "RU" } }), makeEnv(), {});
    const html = await res.text();
    expect(html).toContain('<html lang="ru"');
    expect(html).toContain("Доставка");
  });

  it("renders English with ?lang=en", async () => {
    const res = await handleRequest(req("/delivery?lang=en"), makeEnv(), {});
    const html = await res.text();
    expect(html).toContain('<html lang="en"');
    expect(html).toContain("Delivery");
    expect(html).not.toContain("Доставка — ");
  });

  it("renders English from kokoc_lang=en cookie", async () => {
    const res = await handleRequest(
      req("/delivery", { headers: { cookie: "kokoc_lang=en" } }),
      makeEnv(), {}
    );
    const html = await res.text();
    expect(html).toContain('<html lang="en"');
  });

  it("renders Russian from kokoc_lang=ru cookie", async () => {
    const res = await handleRequest(
      req("/delivery", { headers: { cookie: "kokoc_lang=ru" } }),
      makeEnv(), {}
    );
    const html = await res.text();
    expect(html).toContain('<html lang="ru"');
  });

  it("?lang= query param overrides cookie", async () => {
    const res = await handleRequest(
      req("/delivery?lang=en", { headers: { cookie: "kokoc_lang=ru" } }),
      makeEnv(), {}
    );
    const html = await res.text();
    expect(html).toContain('<html lang="en"');
    expect(html).not.toContain('<html lang="ru"');
  });

  it("sets Set-Cookie: kokoc_lang=en when ?lang=en is passed", async () => {
    const res = await handleRequest(req("/delivery?lang=en"), makeEnv(), {});
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("kokoc_lang=en");
    expect(cookie).toContain("Path=/");
  });

  it("falls back to geo-detected Russian for unsupported ?lang=fr (visitor from Russia)", async () => {
    const res = await handleRequest(req("/delivery?lang=fr", { cf: { country: "RU" } }), makeEnv(), {});
    const html = await res.text();
    expect(html).toContain('<html lang="ru"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Landing page — delivery links updated
// ─────────────────────────────────────────────────────────────────────────────

describe("Landing page — delivery navigation", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("promo banner image links to /delivery", async () => {
    const res = await handleRequest(req("/"), makeEnv(), {});
    const html = await res.text();
    expect(html).toContain('href="/delivery"');
    expect(html).toContain("delivery-bg.jpg");
  });

  it("promo banner does NOT link to /collabs", async () => {
    const res = await handleRequest(req("/"), makeEnv(), {});
    const html = await res.text();
    const deliveryBannerChunk = html.slice(
      html.indexOf("delivery-bg.jpg") - 200,
      html.indexOf("delivery-bg.jpg") + 200
    );
    expect(deliveryBannerChunk).toContain('/delivery"');
    expect(deliveryBannerChunk).not.toContain('/collabs"');
  });

  it("desktop-nav on landing includes /delivery link", async () => {
    const res = await handleRequest(req("/"), makeEnv(), {});
    const html = await res.text();
    expect(html).toMatch(/class="desktop-nav"[\s\S]{0,400}href="\/delivery"/);
  });

  it("mobile-nav drawer on landing includes /delivery link", async () => {
    const res = await handleRequest(req("/"), makeEnv(), {});
    const html = await res.text();
    expect(html).toMatch(/class="mobile-nav"[\s\S]{0,400}href="\/delivery"/);
  });

  it("landing in English also shows /delivery link in nav", async () => {
    const res = await handleRequest(req("/?lang=en"), makeEnv(), {});
    const html = await res.text();
    expect(html).toContain('href="/delivery"');
  });
});
