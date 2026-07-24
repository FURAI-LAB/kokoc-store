import { htmlResponse, jsonResponse } from "../../lib/response.js";
import { createSessionCookie, clearSessionCookie, requireAuth, timingSafeEqual } from "./auth.js";
import { rateLimit } from "../../lib/ratelimit.js";
import {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  createVariant, updateVariant, deleteVariant,
  uploadImage, deleteImage
} from "./products.js";
import { listOrders, getOrder, updateOrderStatus } from "./orders.js";
import { listReviews, moderateReviewRoute } from "./reviews.js";
import { renderAdminPage } from "../../pages/admin/index.js";
import { COLLABS } from "../../lib/collabs.js";

// ── Login / Logout ─────────────────────────────────────────

async function hashIp(ip) {
  if (!ip) return "unknown";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

async function handleLogin(request, env) {
  if (request.method === "GET") {
    return htmlResponse(renderAdminPage({ page: "login" }));
  }

  // Rate limit login attempts per IP — 10 tries per 10 minutes — to make
  // brute-forcing env.ADMIN_PASSWORD impractical. This is on top of the
  // constant-time comparison below, which only prevents *timing*-based
  // guessing, not raw brute force.
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ipHash = await hashIp(ip);
  const allowed = await rateLimit(env.KV, "admin-login", ipHash, {
    limit: 10,
    windowMs: 10 * 60 * 1000
  });
  if (!allowed) {
    return jsonResponse({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  if (!env.ADMIN_PASSWORD || !timingSafeEqual(body.password, env.ADMIN_PASSWORD)) {
    return jsonResponse({ ok: false, error: "Wrong password" }, { status: 401 });
  }

  const cookie = await createSessionCookie(env);
  return jsonResponse({ ok: true }, { status: 200, headers: { "Set-Cookie": cookie } });
}

async function handleLogout(env) {
  return new Response(null, {
    status: 302,
    headers: {
      location: "/admin/login",
      "Set-Cookie": clearSessionCookie()
    }
  });
}

// ── Stats ──────────────────────────────────────────────────

async function handleStats(env) {
  try {
    const [productCount, orderCount, revenue, pendingCount, pendingReviews] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as n FROM products WHERE status = 'active'`).first(),
      env.DB.prepare(`SELECT COUNT(*) as n FROM orders`).first(),
      env.DB.prepare(`SELECT COALESCE(SUM(total_minor), 0) as n FROM orders WHERE payment_status = 'paid'`).first(),
      env.DB.prepare(`SELECT COUNT(*) as n FROM orders WHERE status = 'pending'`).first(),
      env.DB.prepare(`SELECT COUNT(*) as n FROM product_reviews WHERE status = 'pending'`).first(),
    ]);
    return jsonResponse({
      ok: true,
      activeProducts: productCount.n,
      totalOrders: orderCount.n,
      revenueMinor: revenue.n,
      pendingOrders: pendingCount.n,
      pendingReviews: pendingReviews.n
    });
  } catch (err) {
    return jsonResponse({
      ok: true,
      activeProducts: 0,
      totalOrders: 0,
      revenueMinor: 0,
      pendingOrders: 0,
      pendingReviews: 0,
      _error: err.message
    });
  }
}

function defaultCollabs() {
  return COLLABS.map(c => ({ ...c }));
}

// ── Main router ────────────────────────────────────────────

export async function handleAdminRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Public routes
  if (path === "/admin/login") return handleLogin(request, env);
  if (path === "/admin/logout") return handleLogout(env);

  // Protected SPA shell - serve admin UI for all /admin/* GET requests (non-API)
  if (method === "GET" && !path.startsWith("/admin/api/")) {
    const redirect = await requireAuth(request, env);
    if (redirect) return redirect;
    return htmlResponse(renderAdminPage({ page: "app" }), {
      headers: { "cache-control": "no-store" }
    });
  }

  // All /admin/api/* routes require auth
  if (path.startsWith("/admin/api/")) {
    const redirect = await requireAuth(request, env);
    if (redirect) return jsonResponse({ ok: false, error: "Unauthorized" }, { status: 401 });

    // Stats
    if (path === "/admin/api/stats" && method === "GET") return handleStats(env);

    if (path === "/admin/api/subscribers" && method === "GET") {
      const { results } = await env.DB.prepare(`
        SELECT id, email, source, created_at
        FROM subscribers
        ORDER BY created_at DESC
        LIMIT 500
      `).all();
      return jsonResponse({ ok: true, subscribers: results, total: results.length });
    }

    // Collabs
    if (path === "/admin/api/collabs" && method === "GET") {
      if (!env.KV) return jsonResponse({ ok: true, collabs: defaultCollabs() });
      const raw = await env.KV.get("collabs:list");
      const list = raw ? JSON.parse(raw) : defaultCollabs();
      return jsonResponse({ ok: true, collabs: list });
    }

    if (path === "/admin/api/collabs" && method === "PUT") {
      if (!env.KV) return jsonResponse({ ok: false, error: "KV namespace not bound" }, { status: 503 });
      const { collabs } = await request.json();
      await env.KV.put("collabs:list", JSON.stringify(collabs));
      return jsonResponse({ ok: true });
    }

    if (path === "/admin/api/collabs/upload" && method === "POST") {
      const bucket = env.PRODUCT_IMAGES;
      if (!bucket) return jsonResponse({ ok: false, error: "R2 bucket not bound" }, { status: 503 });

      const form = await request.formData();
      const file = form.get("file");
      if (!file) return jsonResponse({ ok: false, error: "No file" }, { status: 400 });

      const ext = file.name.split(".").pop().toLowerCase();
      const key = `collabs/${crypto.randomUUID()}.${ext}`;
      await bucket.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
      return jsonResponse({ ok: true, url: `/cdn/${key}` });
    }

    // ── Clients ─────────────────────────────────────────────
    if (path === "/admin/api/clients" && method === "GET") {
      const { results } = await env.DB.prepare(`
        SELECT
          customer_email                          AS email,
          MAX(shipping_name)                      AS name,
          MAX(customer_phone)                     AS phone,
          MAX(shipping_city)                      AS city,
          COUNT(*)                                AS order_count,
          SUM(total_minor)                        AS total_minor,
          MAX(created_at)                         AS last_order_at,
          MIN(created_at)                         AS first_order_at
        FROM orders
        GROUP BY customer_email
        ORDER BY last_order_at DESC
        LIMIT 500
      `).all();
      return jsonResponse({ ok: true, clients: results });
    }

    // ── Categories ──────────────────────────────────────────
    if (path === "/admin/api/categories" && method === "GET") {
      const raw = await env.KV?.get("catalog:categories");
      const list = raw ? JSON.parse(raw) : ["Clogs", "Sandals", "Accessories"];
      return jsonResponse({ ok: true, categories: list });
    }
    if (path === "/admin/api/categories" && method === "PUT") {
      if (!env.KV) return jsonResponse({ ok: false, error: "KV not bound" }, { status: 503 });
      const { categories } = await request.json();
      await env.KV.put("catalog:categories", JSON.stringify(categories));
      return jsonResponse({ ok: true });
    }

    // ── Brands ──────────────────────────────────────────────
    if (path === "/admin/api/brands" && method === "GET") {
      const raw = await env.KV?.get("catalog:brands");
      const list = raw ? JSON.parse(raw) : ["Crocs", "Adidas Originals"];
      return jsonResponse({ ok: true, brands: list });
    }
    if (path === "/admin/api/brands" && method === "PUT") {
      if (!env.KV) return jsonResponse({ ok: false, error: "KV not bound" }, { status: 503 });
      const { brands } = await request.json();
      await env.KV.put("catalog:brands", JSON.stringify(brands));
      return jsonResponse({ ok: true });
    }

    // ── Discounts ────────────────────────────────────────────
    if (path === "/admin/api/discounts" && method === "GET") {
      const raw = await env.KV?.get("catalog:discounts");
      const list = raw ? JSON.parse(raw) : [];
      return jsonResponse({ ok: true, discounts: list });
    }
    if (path === "/admin/api/discounts" && method === "PUT") {
      if (!env.KV) return jsonResponse({ ok: false, error: "KV not bound" }, { status: 503 });
      const { discounts } = await request.json();
      await env.KV.put("catalog:discounts", JSON.stringify(discounts));
      return jsonResponse({ ok: true });
    }

    // ── Settings ────────────────────────────────────────────
    if (path === "/admin/api/settings" && method === "GET") {
      if (!env.KV) return jsonResponse({ ok: true, settings: {} });
      const whatsapp = await env.KV.get("settings:whatsapp_number").catch(() => "");
      return jsonResponse({ ok: true, settings: { whatsapp_number: whatsapp || "" } });
    }
    if (path === "/admin/api/settings" && method === "PUT") {
      if (!env.KV) return jsonResponse({ ok: false, error: "KV not bound" }, { status: 503 });
      const body = await request.json();
      const whatsapp = (body.whatsapp_number || "").trim();
      await env.KV.put("settings:whatsapp_number", whatsapp);
      return jsonResponse({ ok: true });
    }

    // Adidas Originals / Crocs — list products by brand
    if ((path === "/admin/api/adidas" || path === "/admin/api/crocs") && method === "GET") {
      const brand = path === "/admin/api/adidas" ? "Adidas Originals" : "Crocs";
      const { results } = await env.DB.prepare(`
        SELECT p.id, p.slug, p.title, p.description, p.brand,
               p.status, p.badge, p.tags, p.category, p.sku,
               p.visibility, p.colors, p.gender, p.apparel_type,
               p.created_at, p.updated_at,
               COUNT(v.id) AS variant_count
        FROM products p
        LEFT JOIN product_variants v ON v.product_id = p.id
        WHERE p.brand = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 200
      `).bind(brand).all();
      return jsonResponse({ ok: true, products: results });
    }

    // Products
    if (path === "/admin/api/products" && method === "GET") return listProducts(env);
    if (path === "/admin/api/products" && method === "POST") return createProduct(env, await request.json());

    const productMatch = path.match(/^\/admin\/api\/products\/([^/]+)$/);
    if (productMatch) {
      const [, pid] = productMatch;
      if (method === "GET") return getProduct(env, pid);
      if (method === "PATCH") return updateProduct(env, pid, await request.json());
      if (method === "DELETE") return deleteProduct(env, pid);
    }

    // Variants
    const variantCreate = path.match(/^\/admin\/api\/products\/([^/]+)\/variants$/);
    if (variantCreate && method === "POST") {
      return createVariant(env, variantCreate[1], await request.json());
    }

    const variantMatch = path.match(/^\/admin\/api\/variants\/([^/]+)$/);
    if (variantMatch) {
      const [, vid] = variantMatch;
      if (method === "PATCH") return updateVariant(env, vid, await request.json());
      if (method === "DELETE") return deleteVariant(env, vid);
    }

    // Images
    const imgUpload = path.match(/^\/admin\/api\/products\/([^/]+)\/images$/);
    if (imgUpload && method === "POST") return uploadImage(env, imgUpload[1], request);

    const imgDelete = path.match(/^\/admin\/api\/images\/([^/]+)$/);
    if (imgDelete && method === "DELETE") return deleteImage(env, imgDelete[1]);

    // Orders
    if (path === "/admin/api/orders" && method === "GET") return listOrders(env, url);

    const orderMatch = path.match(/^\/admin\/api\/orders\/([^/]+)$/);
    if (orderMatch) {
      const [, oid] = orderMatch;
      if (method === "GET") return getOrder(env, oid);
      if (method === "PATCH") return updateOrderStatus(env, oid, await request.json());
    }

    // Reviews
    if (path === "/admin/api/reviews" && method === "GET") return listReviews(env, url);

    const reviewMatch = path.match(/^\/admin\/api\/reviews\/([^/]+)$/);
    if (reviewMatch && method === "PATCH") {
      return moderateReviewRoute(env, reviewMatch[1], await request.json());
    }

    return jsonResponse({ ok: false, error: "Admin API route not found" }, { status: 404 });
  }

  return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });
}
