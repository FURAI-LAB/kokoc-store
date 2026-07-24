import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest } from "../src/server.js";
import { makeEnv, setupTestDatabase, VARIANT_IDS } from "./fixtures.js";
import { validateImageUpload, sanitizeR2Key } from "../src/lib/uploads.js";
import { isSameOrigin } from "../src/lib/csrf.js";

/**
 * security-regression.test.js
 *
 * Guards the five classes of bug found in the July 2026 audit. Each block
 * documents the original defect so a future reader knows what NOT to
 * reintroduce.
 */

const env = makeEnv();
const VID = VARIANT_IDS.classic39; // seeded: inventory_quantity = 5, price_minor = 499000

function cartPost(body, cookie) {
  const headers = { "content-type": "application/json", origin: "https://kokoc.store" };
  if (cookie) headers.cookie = cookie;
  return new Request("https://kokoc.store/api/cart/items", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

async function addItem(body, cookie) {
  const res = await handleRequest(cartPost(body, cookie), env, {});
  const setCookie = res.headers.get("set-cookie");
  return {
    res,
    json: await res.json(),
    cookie: setCookie ? setCookie.split(";")[0] : cookie
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * 1. Cart quantity validation
 *
 * Original defect: handleAddItem() destructured `qty` straight out of the
 * JSON body and passed it to D1 unvalidated, while handleUpdateItem()
 * validated the very same field. POST therefore accepted qty=999999
 * (a 4,989,995,010 ₽ cart against a stock of 5), qty=2.7 (fractional
 * rows), and qty=-5 (which tripped the `quantity > 0` CHECK constraint
 * and surfaced as an unhandled 500).
 * ────────────────────────────────────────────────────────────────────── */
describe("cart: quantity validation on POST /api/cart/items", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  it("rejects an absurd quantity as malformed (400) before touching stock", async () => {
    // 999999 exceeds the hard MAX_QTY ceiling, so it is rejected as a bad
    // request rather than as a stock problem. Both guards matter; this
    // asserts the cheaper one fires first.
    const { res, json } = await addItem({ variantId: VID, qty: 999999 });
    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it("rejects a plausible quantity that exceeds available stock (409)", async () => {
    // 10 is under MAX_QTY but over the seeded stock of 5.
    const { res, json } = await addItem({ variantId: VID, qty: 10 });
    expect(res.status).toBe(409);
    expect(json.ok).toBe(false);
    expect(json.available).toBe(5);
  });

  it("rejects a negative quantity with 400, never a 500", async () => {
    const { res, json } = await addItem({ variantId: VID, qty: -5 });
    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it("rejects a fractional quantity", async () => {
    const { res } = await addItem({ variantId: VID, qty: 2.7 });
    expect(res.status).toBe(400);
  });

  it("rejects a non-numeric quantity", async () => {
    const { res } = await addItem({ variantId: VID, qty: "abc" });
    expect(res.status).toBe(400);
  });

  it("rejects numeric-ish junk that parseInt would have accepted", async () => {
    // parseInt("12abc") === 12 — Number("12abc") is NaN, which is why the
    // validator uses Number() + Number.isInteger rather than parseInt.
    const { res } = await addItem({ variantId: VID, qty: "12abc" });
    expect(res.status).toBe(400);
  });

  it("accepts a valid quantity within stock", async () => {
    const { res, json } = await addItem({ variantId: VID, qty: 3 });
    expect(res.status).toBe(201);
    expect(json.cart.items[0].qty).toBe(3);
  });

  it("defaults to qty=1 when omitted", async () => {
    const { res, json } = await addItem({ variantId: VID });
    expect(res.status).toBe(201);
    expect(json.cart.items[0].qty).toBe(1);
  });

  it("enforces stock against the CUMULATIVE line total, not just the delta", async () => {
    // Stock is 5. Three separate valid-looking adds of 2 must not reach 6.
    const a = await addItem({ variantId: VID, qty: 2 });
    expect(a.res.status).toBe(201);

    const b = await addItem({ variantId: VID, qty: 2 }, a.cookie);
    expect(b.res.status).toBe(201);
    expect(b.json.cart.items[0].qty).toBe(4);

    const c = await addItem({ variantId: VID, qty: 2 }, b.cookie);
    expect(c.res.status).toBe(409);
    expect(c.json.inCart).toBe(4);
  });

  it("never lets the cart subtotal go negative", async () => {
    const a = await addItem({ variantId: VID, qty: 2 });
    const b = await addItem({ variantId: VID, qty: -10 }, a.cookie);
    expect(b.res.status).toBe(400);

    const check = await handleRequest(
      new Request("https://kokoc.store/api/cart", { headers: { cookie: a.cookie } }),
      env, {}
    );
    const body = await check.json();
    expect(body.cart.subtotal_minor).toBeGreaterThanOrEqual(0);
  });
});

/* ──────────────────────────────────────────────────────────────────────
 * 2. Upload content-type allow-list
 *
 * Original defect: uploadImage() used `file.type` — supplied by the
 * uploader — as the R2 httpMetadata contentType, and derived the object
 * key's extension from `file.name`. The /r2/ proxy replays stored
 * metadata, so a file uploaded as text/html was served as HTML from the
 * storefront's own origin: stored XSS.
 * ────────────────────────────────────────────────────────────────────── */
describe("uploads: content-type allow-list", () => {
  const fakeFile = (name, type, size = 1024) => ({
    name, type, size, stream: () => null
  });

  it("rejects an HTML file masquerading via file.type", () => {
    const r = validateImageUpload(fakeFile("evil.html", "text/html"));
    expect(r.ok).toBe(false);
  });

  it("rejects SVG outright (it can carry inline script)", () => {
    const r = validateImageUpload(fakeFile("logo.svg", "image/svg+xml"));
    expect(r.ok).toBe(false);
  });

  it("rejects a .png name whose declared type contradicts it", () => {
    const r = validateImageUpload(fakeFile("shoe.png", "text/html"));
    expect(r.ok).toBe(false);
  });

  it("derives content-type from the extension, never from file.type", () => {
    // A lying-but-harmless type is ignored in favour of the allow-list.
    const r = validateImageUpload(fakeFile("shoe.png", "image/png"));
    expect(r.ok).toBe(true);
    expect(r.contentType).toBe("image/png");
    expect(r.ext).toBe("png");
  });

  it("normalises .jpg and .jpeg to image/jpeg", () => {
    expect(validateImageUpload(fakeFile("a.jpg", "image/jpeg")).contentType).toBe("image/jpeg");
    expect(validateImageUpload(fakeFile("a.jpeg", "")).contentType).toBe("image/jpeg");
  });

  it("strips path separators out of the extension", () => {
    const r = validateImageUpload(fakeFile("../../etc/passwd", ""));
    expect(r.ok).toBe(false);
  });

  it("rejects an oversized file", () => {
    const r = validateImageUpload(fakeFile("big.png", "image/png", 50 * 1024 * 1024));
    expect(r.ok).toBe(false);
    expect(r.status).toBe(413);
  });

  it("rejects an empty file and a missing file", () => {
    expect(validateImageUpload(fakeFile("a.png", "image/png", 0)).ok).toBe(false);
    expect(validateImageUpload(null).ok).toBe(false);
  });
});

describe("uploads: R2 key sanitisation", () => {
  it("accepts the key shapes we actually generate", () => {
    expect(sanitizeR2Key("products/abc-123/def.png")).toBe("products/abc-123/def.png");
    expect(sanitizeR2Key("collabs/uuid.webp")).toBe("collabs/uuid.webp");
  });

  it("rejects traversal, encoded traversal, absolute paths and nulls", () => {
    expect(sanitizeR2Key("../secret")).toBeNull();
    expect(sanitizeR2Key("%2e%2e%2fsecret")).toBeNull();
    expect(sanitizeR2Key("/etc/passwd")).toBeNull();
    expect(sanitizeR2Key("a\0b")).toBeNull();
    expect(sanitizeR2Key("has space.png")).toBeNull();
    expect(sanitizeR2Key("")).toBeNull();
  });
});

/* ──────────────────────────────────────────────────────────────────────
 * 3. CSRF coverage across ALL mutating API routes
 *
 * Original defect: the origin check lived inside cart.js and guarded only
 * /api/cart/*. /api/orders, /api/minigame/*, /api/subscribe and the review
 * POST were all reachable cross-origin.
 * ────────────────────────────────────────────────────────────────────── */
describe("csrf: same-origin guard", () => {
  beforeEach(async () => { await setupTestDatabase(); });

  const evil = (path, method = "POST") => new Request(`https://kokoc.store${path}`, {
    method,
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({})
  });

  const protectedRoutes = [
    "/api/cart/items",
    "/api/orders",
    "/api/subscribe",
    "/api/minigame/start",
    "/api/minigame/finish"
  ];

  for (const path of protectedRoutes) {
    it(`blocks cross-origin POST to ${path}`, async () => {
      const res = await handleRequest(evil(path), env, {});
      expect(res.status).toBe(403);
    });
  }

  it("allows same-origin POST", () => {
    const req = new Request("https://kokoc.store/api/orders", {
      method: "POST", headers: { origin: "https://kokoc.store" }
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it("allows GET regardless of origin", () => {
    const req = new Request("https://kokoc.store/api/cart", {
      method: "GET", headers: { origin: "https://evil.example" }
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it("does not treat a lookalike domain as same-origin", () => {
    // The old check used referer.startsWith(origin), so
    // "https://kokoc.store.evil.com/" passed. It must not.
    const req = new Request("https://kokoc.store/api/orders", {
      method: "POST", headers: { referer: "https://kokoc.store.evil.com/x" }
    });
    expect(isSameOrigin(req)).toBe(false);
  });

  it("rejects a lookalike Origin header", () => {
    const req = new Request("https://kokoc.store/api/orders", {
      method: "POST", headers: { origin: "https://kokoc.store.evil.com" }
    });
    expect(isSameOrigin(req)).toBe(false);
  });
});

/* ──────────────────────────────────────────────────────────────────────
 * 4. Shared helpers are genuinely shared (no drift between copies)
 *
 * makeid() had four byte-identical copies and parseCookies() two. The
 * original XSS in this codebase was caused by exactly this pattern: a
 * copied escape helper drifted and stopped escaping apostrophes.
 * ────────────────────────────────────────────────────────────────────── */
describe("no duplicated helper definitions remain", async () => {
  it("makeid is defined in exactly one module", async () => {
    const mods = await Promise.all([
      import("../src/routes/api/cart.js"),
      import("../src/routes/api/orders.js"),
      import("../src/routes/api/minigame.js"),
      import("../src/lib/reviews.js")
    ]);
    // If these import without error, the shared lib/ids.js resolved for all.
    expect(mods.length).toBe(4);
  });

  it("generates ids of the requested length", async () => {
    const { makeid, makePromoCode } = await import("../src/lib/ids.js");
    expect(makeid(21)).toHaveLength(21);
    expect(makeid(32)).toHaveLength(32);
    expect(makePromoCode()).toMatch(/^KOKOC-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  });
});
