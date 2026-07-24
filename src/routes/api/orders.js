/**
 * orders.js — Public POST /api/orders
 *
 * Called by the client right before opening the WhatsApp payment modal.
 * Accepts the full cart from localStorage + optional customer contact details,
 * validates every item against D1 (variant exists, in stock, price matches),
 * writes orders + order_items, and returns the new order_number.
 *
 * Request body:
 *   {
 *     items: [{
 *       variantId:    string,
 *       productId:    string,
 *       productSlug:  string,
 *       title:        string,
 *       sizeLabel:    string,
 *       priceMinor:   number,
 *       qty:          number
 *     }],
 *     customerEmail?: string,
 *     customerPhone?: string,
 *     source?:        string   // default: 'whatsapp'
 *   }
 *
 * Response 201:
 *   { ok: true, orderId, orderNumber }
 */

import { jsonResponse, methodNotAllowedResponse } from '../../lib/response.js';
import { makeid } from '../../lib/ids.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Generate a sequential order number via KV atomic counter.
 * Falls back to timestamp-based number if KV is unavailable.
 * Format: KK-YYYYMMDD-NNNN  (e.g. KK-20260628-0042)
 */
async function nextOrderNumber(env) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const kvKey = `order_seq:${today}`;

  if (!env.KV) {
    const ts = Date.now().toString().slice(-4);
    return `KK-${today}-${ts}`;
  }

  try {
    const raw = await env.KV.get(kvKey);
    const seq = (parseInt(raw || '0', 10) + 1);
    // TTL: 48 h so the key expires naturally after the day rolls over
    await env.KV.put(kvKey, String(seq), { expirationTtl: 172800 });
    return `KK-${today}-${String(seq).padStart(4, '0')}`;
  } catch {
    return `KK-${today}-${Date.now().toString().slice(-4)}`;
  }
}

export async function handleCreateOrder(request, env) {
  if (request.method !== 'POST') return methodNotAllowedResponse(['POST']);

  if (!env.DB) {
    return jsonResponse({ ok: false, error: 'DB not available' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { items, customerEmail, customerPhone, source = 'whatsapp' } = body || {};

  // ── Validate items ────────────────────────────────────────────────────────
  if (!Array.isArray(items) || items.length === 0) {
    return jsonResponse({ ok: false, error: 'Cart is empty' }, { status: 400 });
  }
  if (items.length > 50) {
    return jsonResponse({ ok: false, error: 'Too many items' }, { status: 400 });
  }

  // Optional contact fields
  const email = customerEmail ? String(customerEmail).trim().toLowerCase().slice(0, 254) : null;
  const phone = customerPhone ? String(customerPhone).trim().slice(0, 32) : null;

  if (email && !EMAIL_RE.test(email)) {
    return jsonResponse({ ok: false, error: 'Invalid email' }, { status: 400 });
  }

  // ── Validate every item against D1 ────────────────────────────────────────
  const validated = [];
  for (const item of items) {
    const variantId   = String(item.variantId   || '').trim();
    const qty         = parseInt(item.qty, 10);
    const clientPrice = parseInt(item.priceMinor, 10);

    if (!variantId)      return jsonResponse({ ok: false, error: 'variantId required' }, { status: 400 });
    if (!qty || qty < 1) return jsonResponse({ ok: false, error: 'qty must be ≥ 1' },  { status: 400 });
    if (qty > 99)        return jsonResponse({ ok: false, error: 'qty too large' },     { status: 400 });

    const variant = await env.DB.prepare(`
      SELECT
        pv.id, pv.sku, pv.title AS variant_title,
        pv.price_minor, pv.inventory_quantity,
        p.id AS product_id, p.title AS product_title, p.slug
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ? AND pv.is_active = 1 AND p.status = 'active'
    `).bind(variantId).first();

    if (!variant) {
      return jsonResponse(
        { ok: false, error: `Variant ${variantId} not found or inactive` },
        { status: 404 }
      );
    }

    if (variant.inventory_quantity < qty) {
      return jsonResponse(
        { ok: false, error: `Not enough stock for "${variant.product_title}"` },
        { status: 409 }
      );
    }

    // Price sanity: client price must match DB ±1 kopek (rounding).
    // This prevents a client from sending priceMinor=1 to forge a cheap order.
    if (Math.abs(clientPrice - variant.price_minor) > 1) {
      return jsonResponse(
        {
          ok: false,
          error: `Price mismatch for "${variant.product_title}" — please refresh the page`,
          expected: variant.price_minor,
        },
        { status: 409 }
      );
    }

    validated.push({ ...variant, qty, clientTitle: String(item.title || '').trim() });
  }

  // ── Write order + items ───────────────────────────────────────────────────
  const orderId     = makeid();
  const orderNumber = await nextOrderNumber(env);
  const subtotal    = validated.reduce((s, v) => s + v.price_minor * v.qty, 0);

  try {
    // Insert order
    await env.DB.prepare(`
      INSERT INTO orders (
        id, order_number, status, payment_status, fulfillment_status,
        customer_email, customer_phone,
        subtotal_minor, shipping_minor, total_minor, currency_code,
        source, created_at, updated_at
      ) VALUES (
        ?, ?, 'pending', 'awaiting_payment', 'unfulfilled',
        ?, ?,
        ?, 0, ?, 'RUB',
        ?, datetime('now'), datetime('now')
      )
    `).bind(
      orderId, orderNumber,
      email ?? null, phone ?? null,
      subtotal, subtotal,
      source
    ).run();

    // Insert order_items
    for (const v of validated) {
      await env.DB.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, variant_id,
          product_title, variant_title, sku,
          quantity, price_minor, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        makeid(), orderId, v.product_id, v.id,
        v.product_title,
        v.variant_title || null,
        v.sku || null,
        v.qty, v.price_minor
      ).run();
    }
  } catch (err) {
    console.error('createOrder DB error:', err);
    return jsonResponse({ ok: false, error: 'Server error' }, { status: 500 });
  }

  return jsonResponse(
    { ok: true, orderId, orderNumber },
    { status: 201 }
  );
}
