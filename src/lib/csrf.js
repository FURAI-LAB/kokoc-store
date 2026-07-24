/**
 * csrf.js — same-origin guard for state-changing API requests.
 *
 * Why this moved out of routes/api/cart.js
 * ----------------------------------------
 * The origin check used to live inside cart.js and was only ever applied
 * to /api/cart/*. Every other mutating endpoint was reachable cross-origin:
 *
 *   POST /api/orders                — create orders from another site
 *   POST /api/minigame/start|finish — farm promo codes against a visitor's
 *                                     kokoc_sid cookie (SameSite=Lax still
 *                                     sends it on top-level form POSTs)
 *   POST /api/subscribe             — spam the subscriber list
 *   POST /api/products/:slug/reviews — post reviews as a visitor
 *
 * Hoisting the check to the API router means new routes are protected by
 * default instead of opt-in — the failure mode of the old design was that
 * forgetting to add the guard silently left an endpoint open.
 *
 * Note this complements, not replaces, the SameSite=Lax cookies: Lax still
 * permits top-level navigations (a form POST from an attacker page), which
 * is exactly what an origin check catches.
 */

const ALLOWED_ORIGINS = [
  "https://kokoc.store",
  "https://www.kokoc.store"
];

/** Methods that cannot change server state and so need no origin check. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * @param {Request} request
 * @param {{ allowMissingOrigin?: boolean }} [opts]
 *   allowMissingOrigin — permit requests that carry neither Origin nor
 *   Referer. Needed for local dev and the Vitest suite, which construct
 *   bare Requests. Browsers always send at least one of the two on a
 *   cross-origin POST, so this is not a hole a real page can walk through,
 *   but it IS reachable by non-browser clients (curl, scripts) — those are
 *   not the CSRF threat model, since they can't ride a victim's cookies.
 * @returns {boolean} true = allowed
 */
/**
 * Is this URL a local development origin?
 *
 * Parsed with the URL API rather than string prefixes: "http://localhost.evil.com"
 * starts with "http://localhost" but is NOT localhost, and a naive
 * startsWith() check would have waved it through.
 */
function isLocalDevUrl(value) {
  if (!value) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return url.hostname === "localhost"
    || url.hostname === "127.0.0.1"
    || url.hostname === "[::1]"
    || url.hostname === "::1";
}

/** Does this Referer belong to one of our allowed origins? */
function refererMatchesAllowed(referer) {
  if (!referer) return false;
  let url;
  try {
    url = new URL(referer);
  } catch {
    return false;
  }
  // Compare the parsed origin, never a string prefix: startsWith() would
  // have accepted "https://kokoc.store.evil.com/".
  return ALLOWED_ORIGINS.includes(url.origin);
}

export function isSameOrigin(request, { allowMissingOrigin = true } = {}) {
  const method = (request.method || "GET").toUpperCase();
  if (SAFE_METHODS.has(method)) return true;

  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";

  if (!origin && !referer) return allowMissingOrigin;

  // Local development (`wrangler dev`). Checked against BOTH headers:
  // Safari omits Origin on some same-site POSTs and sends only Referer,
  // so an Origin-only check broke order creation under wrangler dev while
  // working fine in production — a bug that would only have surfaced after
  // deploy, when local testing silently stopped working.
  if (isLocalDevUrl(origin) || (!origin && isLocalDevUrl(referer))) return true;

  // Origin is the authoritative signal when present — an attacker page
  // cannot forge it, and unlike Referer it is not stripped by privacy
  // settings. Only fall back to Referer when Origin is absent entirely.
  if (origin) return ALLOWED_ORIGINS.includes(origin);

  return refererMatchesAllowed(referer);
}
