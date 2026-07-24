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

const COOKIE_NAME = "kokoc_sid";
const CART_TTL_DAYS = 30;

/* ── Helpers ──────────────────────────────────────────────── */

function makeid(len = 21) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  arr.forEach(b => { id += chars[b % chars.length]; });
  return id;
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header.split(";").flatMap(s => {
      const idx = s.indexOf("=");
      if (idx === -1) return [];
      try {
        const k = decodeURIComponent(s.slice(0, idx).trim());
        const v = decodeURIComponent(s.slice(idx + 1).trim());
        return [[k, v]];
      } catch { return []; }
    })
  );
}

function setSessionCookie(sid) {
  const expires = new Date(Date.now() + CART_TTL_DAYS * 864e5).toUTCString();
  return `${COOKIE_NAME}=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}

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

  const { variantId, qty = 1 } = body;
  if (!variantId) return jsonResponse({ ok: false, error: "variantId required" }, { status: 400 });

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

  if (existing) {
    const newQty = existing.quantity + qty;
    await env.DB.prepare(
      "UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(newQty, existing.id).run();
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

  const qty = parseInt(body.qty, 10);
  if (!qty || qty < 1) return jsonResponse({ ok: false, error: "qty must be ≥ 1" }, { status: 400 });
  if (qty > 99)        return jsonResponse({ ok: false, error: "qty too large" },    { status: 400 });

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

/* ── CSRF origin guard ────────────────────────────────────────
 * Mutable cart operations (POST / PATCH / DELETE) must originate
 * from the same site. We check Origin first, fall back to Referer.
 * GET is safe and skipped. Localhost is allowed for dev / Vitest.
 * ──────────────────────────────────────────────────────────── */

const ALLOWED_ORIGINS = ["https://kokoc.store", "https://www.kokoc.store"];

function isSameOrigin(request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const origin  = request.headers.get("origin")  || "";
  const referer = request.headers.get("referer") || "";

  // Allow local dev / Vitest (no Origin header or localhost)
  if (!origin && !referer) return true;
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) return true;

  if (origin) return ALLOWED_ORIGINS.includes(origin);

  // Fallback: Referer must start with an allowed origin
  return ALLOWED_ORIGINS.some(o => referer.startsWith(o));
}

/* ── Main export ──────────────────────────────────────────── */

export async function handleCartRequest(request, env) {
  /* CSRF guard — reject cross-origin mutations */
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
