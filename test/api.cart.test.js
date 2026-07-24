import { beforeEach, describe, expect, it } from "vitest";
import { appConfig } from "../src/config/app.js";
import { handleApiRequest } from "../src/routes/api/index.js";
import { makeEnv, setupTestDatabase, VARIANT_IDS } from "./fixtures.js";

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);
const json = async (response) => response.json();

function sessionCookie(response) {
  const cookie = response.headers.get("Set-Cookie");
  expect(cookie).toBeTruthy();
  return cookie.match(/kokoc_sid=[^;]+/)[0];
}

describe("cart API", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("creates an empty cart on GET /api/cart", async () => {
    const response = await handleApiRequest(request("/api/cart"), makeEnv(), appConfig);
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("kokoc_sid=");
    expect(body).toMatchObject({
      ok: true,
      cart: {
        currency: "RUB",
        subtotal_minor: 0,
        subtotal: "0 ₽",
        item_count: 0,
        items: []
      }
    });
  });

  it("adds, updates, and removes cart items with the session cookie", async () => {
    const addResponse = await handleApiRequest(
      request("/api/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId: VARIANT_IDS.classic39, qty: 2 })
      }),
      makeEnv(),
      appConfig
    );
    const addBody = await json(addResponse);
    const cookie = sessionCookie(addResponse);
    const itemId = addBody.cart.items[0].id;

    expect(addResponse.status).toBe(201);
    expect(addBody.cart).toMatchObject({
      subtotal_minor: 998000,
      item_count: 2
    });
    expect(addBody.cart.items[0]).toMatchObject({
      qty: 2,
      price_minor: 499000,
      line_total: "9 980 ₽",
      variant: { id: VARIANT_IDS.classic39, size: "M5 W7", color: "Bone" },
      product: { title: "Classic Clog", slug: "classic-clog" }
    });

    const updateResponse = await handleApiRequest(
      request(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ qty: 3 })
      }),
      makeEnv(),
      appConfig
    );
    const updateBody = await json(updateResponse);

    expect(updateResponse.status).toBe(200);
    expect(updateBody.cart).toMatchObject({
      subtotal_minor: 1497000,
      item_count: 3
    });
    expect(updateBody.cart.items[0].qty).toBe(3);

    const removeResponse = await handleApiRequest(
      request(`/api/cart/items/${itemId}`, {
        method: "DELETE",
        headers: { cookie }
      }),
      makeEnv(),
      appConfig
    );
    const removeBody = await json(removeResponse);

    expect(removeResponse.status).toBe(200);
    expect(removeBody.cart).toMatchObject({
      subtotal_minor: 0,
      item_count: 0,
      items: []
    });
  });

  it("rejects missing and unavailable variants", async () => {
    const missingResponse = await handleApiRequest(
      request("/api/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      }),
      makeEnv(),
      appConfig
    );

    const soldOutResponse = await handleApiRequest(
      request("/api/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId: VARIANT_IDS.classic40, qty: 1 })
      }),
      makeEnv(),
      appConfig
    );

    expect(missingResponse.status).toBe(400);
    expect(await json(missingResponse)).toMatchObject({ ok: false, error: "variantId required" });
    expect(soldOutResponse.status).toBe(409);
    expect(await json(soldOutResponse)).toMatchObject({ ok: false, error: "Out of stock" });
  });
});
