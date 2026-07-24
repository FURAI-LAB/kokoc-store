import { beforeEach, describe, expect, it } from "vitest";
import { appConfig } from "../src/config/app.js";
import { handleApiRequest } from "../src/routes/api/index.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);
const json = async (response) => response.json();

describe("catalog product API", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("returns paginated active products with prices and images", async () => {
    const response = await handleApiRequest(
      request("/api/catalog/products?limit=1&offset=0&sort=price_asc"),
      makeEnv(),
      appConfig
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.pagination).toEqual({ total: 2, limit: 1, offset: 0 });
    expect(body.products).toHaveLength(1);
    expect(body.products[0]).toMatchObject({
      title: "Classic Clog",
      slug: "classic-clog",
      price: "4 990 ₽",
      comparePrice: "5 990 ₽",
      image: "/r2/products/classic-main.jpg"
    });
  });

  it("filters catalog by tag", async () => {
    const response = await handleApiRequest(
      request("/api/catalog/products?tag=platform"),
      makeEnv(),
      appConfig
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.products.map((product) => product.slug)).toEqual(["platform-clog"]);
  });

  it("returns product detail with variants and images", async () => {
    const response = await handleApiRequest(
      request("/api/catalog/products/classic-clog"),
      makeEnv(),
      appConfig
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.product).toMatchObject({
      title: "Classic Clog",
      slug: "classic-clog",
      badge: "hit",
      images: [
        { src: "/r2/products/classic-main.jpg", alt: "Classic Clog" },
        { src: "/r2/products/classic-side.jpg", alt: "Classic Clog side" }
      ]
    });
    expect(body.product.variants).toEqual([
      expect.objectContaining({
        id: "var_classic_39",
        crocsSize: "M5 W7",
        priceMinor: 499000,
        inStock: true
      }),
      expect.objectContaining({
        id: "var_classic_40",
        crocsSize: "M6 W8",
        priceMinor: 529000,
        inStock: false
      })
    ]);
  });

  it("returns 404 for missing or inactive products", async () => {
    const response = await handleApiRequest(
      request("/api/catalog/products/hidden-clog"),
      makeEnv(),
      appConfig
    );
    const body = await json(response);

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ ok: false, error: "Not found" });
  });
});
