/**
 * cart.js — Cart API routes
 *
 * Cart state lives in D1 (carts + cart_items tables from migration 0001).
 * Session is tracked via a cookie: kokoc_sid (httpOnly, Secure, SameSite=Lax).
 *
 * Routes:
 *   GET  /api/cart          — get current cart
 *   POST /api/cart/items    — add item { variantId, qty? }
 *   DELETE /api/cart/items/:itemId — remove item
 *   PATCH /api/cart/items/:itemId  — update qty { qty }
 */

import { jsonResponse, methodNotAllowedResponse, notFoundResponse } from "../../lib/response.js";
import { isSameOrigin } from "../../lib/csrf.js";
import { makeid } from "../../lib/ids.js";
import {
  parseCookies,
  setSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_TTL_DAYS
} from "../../lib/cookies.js";

const COOKIE_NAME = SESSION_COOKIE_NAME;
const CART_TTL_DAYS = SESSION_TTL_DAYS;
const MAX_QTY = 99;

/**
 * Parse and validate a client-supplied quantity.
 *
 * Returns { ok: true, qty } or { ok: false, error }.
 *
 * Every mutating cart route funnels through this — previously
 * handleUpdateItem() validated qty but handleAddItem() did not, so
 * POST accepted values that PATCH rejected on the very same resource:
 * qty=999999 (ordering far beyond stock), qty=2.7 (fractional rows in
 * D1) and qty=-5 (which tripped the `quantity > 0` CHECK constraint
 * and surfaced as an unhandled 500 instead of a 400).
 *
 * parseInt is deliberately NOT used: parseInt("12abc") === 12 would
 * silently accept junk. Number() + Number.isInteger rejects the whole
 * value, and the null/"" guard stops Number("") === 0 slipping through.
 */
function parseQty(raw, { fallback = null } = {}) {
  if (raw === undefined && fallback !== null) raw = fallback;
  if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") {
    return { ok: false, error: "qty must be an integer" };
  }
  const qty = Number(raw);
  if (!Number.isInteger(qty)) return { ok: false, error: "qty must be an integer" };
  if (qty < 1) return { ok: false, error: "qty must be ≥ 1" };
  if (qty > MAX_QTY) return { ok: false, error: "qty too large" };
  return { ok: true, qty };
}

/* ── Helpers ──────────────────────────────────────────────── */

function fmt(minor) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency", currency: "RUB", minimumFractionDigits: 0,
  }).format(minor / 100);
}

/* ── Get or create cart ───────────────────────────────────── */

async function getOrCreateCart(env, sid) {
  if (sid) {
    const cart = await env.DB.prepare(
      "SELECT * FROM carts WHERE session_token = ? AND status = 'open'"
    ).bind(sid).first();
    if (cart) return { cart, isNew: false };
  }

  const newSid = makeid(32);
  const cartId = makeid();
  const expires = new Date(Date.now() + CART_TTL_DAYS * 864e5).toISOString();

  await env.DB.prepare(
    `INSERT INTO carts (id, session_token, status, currency_code, expires_at)
     VALUES (?, ?, 'open', 'RUB', ?)`
  ).bind(cartId, newSid, expires).run();

  const cart = await env.DB.prepare(
    "SELECT * FROM carts WHERE id = ?"
  ).bind(cartId).first();

  return { cart, isNew: true, newSid };
}

/* ── Build cart response ─────────────────────────────────── */

async function buildCartResponse(env, cartId) {
  const { results: items } = await env.DB.prepare(`
    SELECT
      ci.id, ci.quantity, ci.price_minor,
      pv.id AS variant_id, pv.crocs_size, pv.size_label, pv.color_label, pv.title AS variant_title,
      p.id AS product_id, p.title AS product_title, p.slug,
      pi.r2_key
    FROM cart_items ci
    JOIN product_variants pv ON pv.id = ci.variant_id
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.position = 0
    WHERE ci.cart_id = ?
    ORDER BY ci.created_at ASC
  `).bind(cartId).all();

  const subtotal = items.reduce((s, i) => s + i.price_minor * i.quantity, 0);

  return {
    id: cartId,
    currency: "RUB",
    subtotal_minor: subtotal,
    subtotal: fmt(subtotal),
    item_count: items.reduce((s, i) => s + i.quantity, 0),
    items: items.map(i => ({
      id: i.id,
      qty: i.quantity,
      price_minor: i.price_minor,
      price: fmt(i.price_minor),
      line_total: fmt(i.price_minor * i.quantity),
      variant: {
        id: i.variant_id,
        size: i.crocs_size || i.size_label || i.variant_title,
        color: i.color_label || null,
      },
      product: {
        id: i.product_id,
        title: i.product_title,
        slug: i.slug,
        image: i.r2_key ? `/r2/${i.r2_key}` : "/crops/product-placeholder.png",
      },
    })),
  };
}

/* ── Route handlers ───────────────────────────────────────── */

async function handleGetCart(request, env) {
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const sid = cookies[COOKIE_NAME] || null;

  const { cart, isNew, newSid } = await getOrCreateCart(env, sid);
  const data = await buildCartResponse(env, cart.id);

  const headers = {};
  if (isNew) headers["Set-Cookie"] = setSessionCookie(newSid);
  return jsonResponse({ ok: true, cart: data }, { headers });
}

async function handleAddItem(request, env) {
  if (request.method !== "POST") return methodNotAllowedResponse(["POST"]);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const { variantId } = body;
  if (!variantId) return jsonResponse({ ok: false, error: "variantId required" }, { status: 400 });

  const parsed = parseQty(body.qty, { fallback: 1 });
  if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, { status: 400 });
  const qty = parsed.qty;

  /* Validate variant exists and is in stock */
  const variant = await env.DB.prepare(
    "SELECT * FROM product_variants WHERE id = ? AND is_active = 1"
  ).bind(variantId).first();

  if (!variant) return jsonResponse({ ok: false, error: "Variant not found" }, { status: 404 });
  if (variant.inventory_quantity < 1) return jsonResponse({ ok: false, error: "Out of stock" }, { status: 409 });

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const sid = cookies[COOKIE_NAME] || null;
  const { cart, isNew, newSid } = await getOrCreateCart(env, sid);

  /* Upsert cart item */
  const existing = await env.DB.prepare(
    "SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?"
  ).bind(cart.id, variantId).first();

  /* Stock check applies to the RESULTING line quantity, not just the
   * delta — otherwise "add 5" repeated ten times walks past a stock of
   * 5 one request at a time. Same for the MAX_QTY ceiling. */
  const resultingQty = existing ? existing.quantity + qty : qty;

  if (resultingQty > MAX_QTY) {
    return jsonResponse(
      { ok: false, error: "qty too large", max: MAX_QTY, inCart: existing?.quantity ?? 0 },
      { status: 400 }
    );
  }
  if (resultingQty > variant.inventory_quantity) {
    return jsonResponse(
      {
        ok: false,
        error: "Not enough stock",
        available: variant.inventory_quantity,
        inCart: existing?.quantity ?? 0
      },
      { status: 409 }
    );
  }

  if (existing) {
    await env.DB.prepare(
      "UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(resultingQty, existing.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO cart_items (id, cart_id, variant_id, quantity, price_minor)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(makeid(), cart.id, variantId, qty, variant.price_minor).run();
  }

  /* Update cart totals */
  const { results: allItems } = await env.DB.prepare(
    "SELECT price_minor, quantity FROM cart_items WHERE cart_id = ?"
  ).bind(cart.id).all();
  const subtotal = allItems.reduce((s, i) => s + i.price_minor * i.quantity, 0);
  await env.DB.prepare(
    "UPDATE carts SET subtotal_minor = ?, total_minor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(subtotal, subtotal, cart.id).run();

  const data = await buildCartResponse(env, cart.id);
  const headers = {};
  if (isNew) headers["Set-Cookie"] = setSessionCookie(newSid);
  return jsonResponse({ ok: true, cart: data }, { status: 201, headers });
}

async function handleRemoveItem(request, env, itemId) {
  if (request.method !== "DELETE") return methodNotAllowedResponse(["DELETE"]);

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const sid = cookies[COOKIE_NAME];
  if (!sid) return jsonResponse({ ok: false, error: "No session" }, { status: 401 });

  const cart = await env.DB.prepare(
    "SELECT * FROM carts WHERE session_token = ? AND status = 'open'"
  ).bind(sid).first();
  if (!cart) return notFoundResponse({ message: "Cart not found" });

  const item = await env.DB.prepare(
    "SELECT * FROM cart_items WHERE id = ? AND cart_id = ?"
  ).bind(itemId, cart.id).first();
  if (!item) return notFoundResponse({ message: "Item not found" });

  await env.DB.prepare("DELETE FROM cart_items WHERE id = ?").bind(itemId).run();

  /* Recalculate totals */
  const { results: allItems } = await env.DB.prepare(
    "SELECT price_minor, quantity FROM cart_items WHERE cart_id = ?"
  ).bind(cart.id).all();
  const subtotal = allItems.reduce((s, i) => s + i.price_minor * i.quantity, 0);
  await env.DB.prepare(
    "UPDATE carts SET subtotal_minor = ?, total_minor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(subtotal, subtotal, cart.id).run();

  const data = await buildCartResponse(env, cart.id);
  return jsonResponse({ ok: true, cart: data });
}

async function handleUpdateItem(request, env, itemId) {
  if (request.method !== "PATCH") return methodNotAllowedResponse(["PATCH"]);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const parsed = parseQty(body.qty);
  if (!parsed.ok) return jsonResponse({ ok: false, error: parsed.error }, { status: 400 });
  const qty = parsed.qty;

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const sid = cookies[COOKIE_NAME];
  if (!sid) return jsonResponse({ ok: false, error: "No session" }, { status: 401 });

  const cart = await env.DB.prepare(
    "SELECT * FROM carts WHERE session_token = ? AND status = 'open'"
  ).bind(sid).first();
  if (!cart) return notFoundResponse({ message: "Cart not found" });

  /* Inventory re-check: requested qty must not exceed available stock */
  const item = await env.DB.prepare(
    "SELECT ci.variant_id FROM cart_items ci WHERE ci.id = ? AND ci.cart_id = ?"
  ).bind(itemId, cart.id).first();
  if (!item) return notFoundResponse({ message: "Item not found" });

  const variant = await env.DB.prepare(
    "SELECT inventory_quantity FROM product_variants WHERE id = ?"
  ).bind(item.variant_id).first();

  if (variant && qty > variant.inventory_quantity) {
    return jsonResponse(
      { ok: false, error: "Not enough stock", available: variant.inventory_quantity },
      { status: 409 }
    );
  }

  await env.DB.prepare(
    "UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND cart_id = ?"
  ).bind(qty, itemId, cart.id).run();

  /* Recalculate totals */
  const { results: allItems } = await env.DB.prepare(
    "SELECT price_minor, quantity FROM cart_items WHERE cart_id = ?"
  ).bind(cart.id).all();
  const subtotal = allItems.reduce((s, i) => s + i.price_minor * i.quantity, 0);
  await env.DB.prepare(
    "UPDATE carts SET subtotal_minor = ?, total_minor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(subtotal, subtotal, cart.id).run();

  const data = await buildCartResponse(env, cart.id);
  return jsonResponse({ ok: true, cart: data });
}

/* ── Main export ──────────────────────────────────────────── */

/**
 * Note: the CSRF/same-origin guard that used to live here has moved to
 * lib/csrf.js and is now applied for ALL /api/* routes in
 * routes/api/index.js — so it covers orders, minigame and subscribe too,
 * not just the cart. Kept as a defence-in-depth call below in case this
 * handler is ever wired up from somewhere other than the API router.
 */
export async function handleCartRequest(request, env) {
  if (!isSameOrigin(request)) {
    return jsonResponse(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);

  // GET/POST /api/cart
  if (url.pathname === "/api/cart") {
    if (request.method === "GET")  return handleGetCart(request, env);
    if (request.method === "POST") {
      // Alias: POST /api/cart == add item
      return handleAddItem(request, env);
    }
    return methodNotAllowedResponse(["GET", "POST"]);
  }

  // POST /api/cart/items
  if (url.pathname === "/api/cart/items" && request.method === "POST") {
    return handleAddItem(request, env);
  }

  // PATCH or DELETE /api/cart/items/:id — single regex, branch on method
  const itemMatch = url.pathname.match(/^\/api\/cart\/items\/([^/]+)$/);
  if (itemMatch) {
    if (request.method === "PATCH")  return handleUpdateItem(request, env, itemMatch[1]);
    if (request.method === "DELETE") return handleRemoveItem(request, env, itemMatch[1]);
    return methodNotAllowedResponse(["PATCH", "DELETE"]);
  }

  return notFoundResponse({ message: "Cart route not found" });
}
