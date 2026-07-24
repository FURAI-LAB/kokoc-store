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
export function isSameOrigin(request, { allowMissingOrigin = true } = {}) {
  const method = (request.method || "GET").toUpperCase();
  if (SAFE_METHODS.has(method)) return true;

  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";

  if (!origin && !referer) return allowMissingOrigin;

  // Localhost / 127.0.0.1 for `wrangler dev`.
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) return true;

  // Origin is the authoritative signal when present — an attacker page
  // cannot forge it, and unlike Referer it is not stripped by privacy
  // settings. Only fall back to Referer when Origin is absent entirely.
  if (origin) return ALLOWED_ORIGINS.includes(origin);

  return ALLOWED_ORIGINS.some(o => referer === o || referer.startsWith(o + "/"));
}
