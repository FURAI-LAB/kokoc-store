import { jsonResponse } from "../../lib/response.js";
import { sendEmail } from "../../lib/email.js";
import { rateLimit } from "../../lib/ratelimit.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function hashIp(ip) {
  if (!ip) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export async function handleSubscribe(request, env, ctx) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  let email;
  try {
    const body = await request.json();
    email = (body.email || "").trim().toLowerCase();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return jsonResponse({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  if (email.length > 254) {
    return jsonResponse({ ok: false, error: "Email is too long" }, { status: 400 });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ipHash = await hashIp(ip);

  /* ── Rate limit: 5 subscribes per IP per hour ─────────────── */
  const allowed = await rateLimit(env.KV, "subscribe", ipHash, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return jsonResponse(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    await env.DB.prepare(`
      INSERT INTO subscribers (id, email, source, ip_hash)
      VALUES (?, ?, 'newsletter', ?)
    `).bind(crypto.randomUUID(), email, ipHash).run();

    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    ctx.waitUntil(
      sendEmail(env, {
        to: "kokoc.store@gmail.com",
        subject: `🐾 New subscriber — ${email}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="margin:0 0 16px;font-size:20px">New subscriber to Kokoc Store</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="padding:10px 0;color:#888;width:100px">Email</td>
                <td style="padding:10px 0;font-weight:600">${email}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#888">Date</td>
                <td style="padding:10px 0">${now} (GMT+7)</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#888">Source</td>
                <td style="padding:10px 0">Newsletter form</td>
              </tr>
            </table>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="font-size:12px;color:#aaa;margin:0">
              Kokoc Store · kokoc.store
            </p>
          </div>
        `,
      })
    );

    return jsonResponse({ ok: true, message: "You're subscribed" }, { status: 201 });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) {
      return jsonResponse({ ok: true, message: "Already subscribed" }, { status: 200 });
    }
    return jsonResponse({ ok: false, error: "Server error" }, { status: 500 });
  }
}
