// Admin auth via signed session cookie
// Requires env.ADMIN_PASSWORD and env.ADMIN_SECRET (random 32+ char string)

const COOKIE_NAME = "kokoc_admin";
const SESSION_TTL_SEC = 60 * 60 * 8; // 8 hours

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/**
 * Constant-time string comparison, to avoid leaking secret length/content
 * via response-time differences. Used for both the admin password check
 * and the session HMAC check — neither should ever use `===` directly.
 *
 * crypto.subtle.timingSafeEqual is a Cloudflare Workers / workerd-specific
 * extension to the Web Crypto API (not available in Node or browsers). It
 * throws if the two buffers have different lengths, so a length mismatch
 * is handled by comparing the buffer against itself instead of returning
 * early — returning early would leak the secret's length via timing.
 */
export function timingSafeEqual(a, b) {
  const bufA = new TextEncoder().encode(String(a ?? ""));
  const bufB = new TextEncoder().encode(String(b ?? ""));
  if (bufA.byteLength !== bufB.byteLength) {
    crypto.subtle.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.subtle.timingSafeEqual(bufA, bufB);
}

export async function createSessionCookie(env) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `${expires}`;
  const sig = await hmac(env.ADMIN_SECRET, payload);
  const token = btoa(`${payload}.${sig}`);
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=${SESSION_TTL_SEC}`;
}

export async function isValidSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;

  try {
    const raw = atob(match[1]);
    const dotIdx = raw.lastIndexOf(".");
    const payload = raw.slice(0, dotIdx);
    const sig = raw.slice(dotIdx + 1);
    const expires = parseInt(payload, 10);
    if (Date.now() / 1000 > expires) return false;
    const expected = await hmac(env.ADMIN_SECRET, payload);
    return timingSafeEqual(sig, expected);
  } catch {
    return false;
  }
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=0`;
}

export async function requireAuth(request, env) {
  if (await isValidSession(request, env)) return null;
  return new Response(null, {
    status: 302,
    headers: { location: "/admin/login" }
  });
}
