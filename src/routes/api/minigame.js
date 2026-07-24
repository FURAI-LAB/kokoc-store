/**
 * minigame.js — API routes for "Собери Jibbitz" (match-3 mini-game)
 *
 * Routes:
 *   POST /api/minigame/start   — start a session, get back a seed + sessionId
 *   POST /api/minigame/finish  — submit the move list for a session; server
 *                                 replays the moves itself (see
 *                                 lib/minigame-engine.js) to compute the
 *                                 authoritative score, then issues a promo
 *                                 code the first time a device crosses the
 *                                 threshold.
 *   GET  /api/minigame/status  — has this device already earned a code?
 *                                 (lets the client show "you already have a
 *                                 code" instead of dangling a prize forever)
 *
 * Device identity reuses the same kokoc_sid cookie the cart already sets
 * (httpOnly, Secure, SameSite=Lax) rather than inventing a second cookie —
 * one session identity per browser is enough for this feature and keeps the
 * cookie surface small.
 */

import { jsonResponse, methodNotAllowedResponse } from "../../lib/response.js";
import { rateLimit } from "../../lib/ratelimit.js";
import { makeid, makePromoCode } from "../../lib/ids.js";
import { parseCookies, setSessionCookie, SESSION_COOKIE_NAME } from "../../lib/cookies.js";
import {
  seedFromString,
  replayGame,
  PROMO_SCORE_THRESHOLD,
  MAX_MOVES
} from "../../lib/minigame-engine.js";

const COOKIE_NAME = SESSION_COOKIE_NAME;
const PROMO_TTL_DAYS = 14;
const PROMO_DISCOUNT_MINOR = 50000; // 500.00 RUB, fixed
const SESSION_TTL_MINUTES = 30; // a session must be finished within this window

async function hashIp(ip) {
  if (!ip) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

/** Resolve (and mint if missing) the device sid, returning both the value
 *  and an optional Set-Cookie header to attach to the response. */
function resolveDeviceSid(request) {
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const existing = cookies[COOKIE_NAME];
  if (existing) return { sid: existing, setCookie: null };
  const sid = makeid(32);
  return { sid, setCookie: setSessionCookie(sid) };
}

function withCookie(response, setCookie) {
  if (!setCookie) return response;
  const headers = new Headers(response.headers);
  headers.append("set-cookie", setCookie);
  return new Response(response.body, { status: response.status, headers });
}

/* ── POST /api/minigame/start ─────────────────────────────────────────── */

async function handleStart(request, env) {
  if (request.method !== "POST") return methodNotAllowedResponse(["POST"]);
  if (!env.DB) return jsonResponse({ ok: false, error: "DB not bound" }, { status: 503 });

  const { sid, setCookie } = resolveDeviceSid(request);

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ipHash = await hashIp(ip);
  const allowed = await rateLimit(env.KV, "minigame_start", ipHash || sid, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return jsonResponse({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const sessionId = makeid(24);
  // Mix in fresh randomness so seeds aren't guessable/replayable from the
  // sessionId alone, while staying a plain 32-bit int for the PRNG.
  const seed = seedFromString(sessionId + ":" + crypto.randomUUID());

  await env.DB.prepare(
    `INSERT INTO minigame_sessions (id, device_sid, seed, status) VALUES (?, ?, ?, 'open')`
  ).bind(sessionId, sid, seed).run();

  const response = jsonResponse({
    ok: true,
    sessionId,
    seed,
    maxMoves: MAX_MOVES,
  }, { status: 201 });

  return withCookie(response, setCookie);
}

/* ── POST /api/minigame/finish ────────────────────────────────────────── */

async function handleFinish(request, env) {
  if (request.method !== "POST") return methodNotAllowedResponse(["POST"]);
  if (!env.DB) return jsonResponse({ ok: false, error: "DB not bound" }, { status: 503 });

  const { sid, setCookie } = resolveDeviceSid(request);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = String(payload?.sessionId || "");
  const moves = Array.isArray(payload?.moves) ? payload.moves : [];

  if (!sessionId) {
    return jsonResponse({ ok: false, error: "sessionId is required" }, { status: 400 });
  }
  if (moves.length > MAX_MOVES) {
    // Not fatal — replayGame() caps internally too — but a client sending
    // wildly more than the limit is worth rejecting outright as malformed.
    return jsonResponse({ ok: false, error: `moves exceeds limit of ${MAX_MOVES}` }, { status: 400 });
  }

  const session = await env.DB.prepare(
    `SELECT * FROM minigame_sessions WHERE id = ? AND device_sid = ?`
  ).bind(sessionId, sid).first();

  if (!session) {
    return jsonResponse({ ok: false, error: "Session not found" }, { status: 404 });
  }
  if (session.status === "finished") {
    // Session already scored — return what it already earned, don't
    // recompute or re-award (prevents double-submission race).
    return jsonResponse({
      ok: true,
      score: session.score,
      promoAlreadyIssued: true,
      message: "This session was already scored."
    });
  }

  const createdAt = new Date(session.created_at + "Z").getTime();
  if (Number.isFinite(createdAt) && Date.now() - createdAt > SESSION_TTL_MINUTES * 60 * 1000) {
    await env.DB.prepare(`UPDATE minigame_sessions SET status = 'finished', score = 0, finished_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(sessionId).run();
    return jsonResponse({ ok: false, error: "Session expired" }, { status: 410 });
  }

  // ── The trust boundary: replay the moves ourselves against the seed we
  // issued. The client's own on-screen score is cosmetic only — this is the
  // number that decides whether a promo gets minted. ─────────────────────
  const { score } = replayGame(session.seed, moves);

  await env.DB.prepare(
    `UPDATE minigame_sessions SET status = 'finished', score = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(score, sessionId).run();

  const qualifies = score >= PROMO_SCORE_THRESHOLD;
  let promo = null;
  let promoError = null;

  if (qualifies) {
    // One promo per device, ever (per source). If they already have one —
    // active or used — surface it instead of silently failing on the
    // UNIQUE constraint.
    const existingPromo = await env.DB.prepare(
      `SELECT code, status, expires_at FROM promo_codes WHERE device_sid = ? AND source = 'minigame'`
    ).bind(sid).first();

    if (existingPromo) {
      promo = existingPromo;
    } else {
      const code = makePromoCode();
      const expiresAt = new Date(Date.now() + PROMO_TTL_DAYS * 864e5).toISOString();
      try {
        await env.DB.prepare(
          `INSERT INTO promo_codes (code, source, device_sid, discount_type, discount_value_minor, applies_to, status, expires_at)
           VALUES (?, 'minigame', ?, 'fixed', ?, 'crocs', 'active', ?)`
        ).bind(code, sid, PROMO_DISCOUNT_MINOR, expiresAt).run();
        promo = { code, status: "active", expires_at: expiresAt };
      } catch (err) {
        // Extremely unlikely race (two finishes for the same device landing
        // at once) — fall back to reading back whatever won the race.
        if (String(err.message || "").includes("UNIQUE")) {
          promo = await env.DB.prepare(
            `SELECT code, status, expires_at FROM promo_codes WHERE device_sid = ? AND source = 'minigame'`
          ).bind(sid).first();
        } else {
          promoError = "Could not issue promo code, please contact support.";
        }
      }
    }
  }

  const response = jsonResponse({
    ok: true,
    score,
    threshold: PROMO_SCORE_THRESHOLD,
    qualifies,
    promo: promo ? {
      code: promo.code,
      discountRub: PROMO_DISCOUNT_MINOR / 100,
      appliesTo: "crocs",
      status: promo.status,
      expiresAt: promo.expires_at,
    } : null,
    ...(promoError ? { promoError } : {}),
  });

  return withCookie(response, setCookie);
}

/* ── GET /api/minigame/status ─────────────────────────────────────────── */

async function handleStatus(request, env) {
  if (request.method !== "GET") return methodNotAllowedResponse(["GET"]);
  if (!env.DB) return jsonResponse({ ok: true, promo: null });

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const sid = cookies[COOKIE_NAME];
  if (!sid) return jsonResponse({ ok: true, promo: null });

  const promo = await env.DB.prepare(
    `SELECT code, discount_value_minor, applies_to, status, expires_at FROM promo_codes WHERE device_sid = ? AND source = 'minigame'`
  ).bind(sid).first();

  return jsonResponse({
    ok: true,
    promo: promo ? {
      code: promo.code,
      discountRub: promo.discount_value_minor / 100,
      appliesTo: promo.applies_to,
      status: promo.status,
      expiresAt: promo.expires_at,
    } : null,
  });
}

export async function handleMinigameRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === "/api/minigame/start") return handleStart(request, env);
  if (url.pathname === "/api/minigame/finish") return handleFinish(request, env);
  if (url.pathname === "/api/minigame/status") return handleStatus(request, env);

  return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });
}
