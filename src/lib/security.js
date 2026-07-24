const baseSecurityHeaders = {
  "permissions-policy": "camera=(), geolocation=(self), microphone=(), payment=(), usb=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY"
};

/**
 * Generates a fresh per-request CSP nonce. Call once per request in
 * server.js and thread the same value through to every renderXPage()
 * call and into withSecurityHeaders() — the nonce embedded in each
 * page's <script nonce="..."> tag must match the one sent in the
 * Content-Security-Policy header for that same response, or the
 * browser blocks the script.
 *
 * crypto.randomUUID() is unguessable (122 bits of randomness) and
 * available natively in the Workers runtime — no extra dependency.
 */
export function generateNonce() {
  return crypto.randomUUID();
}

/**
 * Builds the CSP for a public storefront page. script-src uses the
 * per-request nonce instead of 'unsafe-inline' — only the inline
 * <script> block we deliberately emit (which carries this exact
 * nonce) is allowed to run, so a script tag smuggled in through an
 * XSS bug elsewhere on the page won't execute.
 *
 * style-src stays 'unsafe-inline': every page ships one inline
 * <style> block for its layout, CSS injection alone can't achieve
 * script execution, and nonce-ing styles too would just be extra
 * plumbing for little additional protection.
 */
function contentSecurityPolicy(nonce) {
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    nonce ? `script-src 'self' 'nonce-${nonce}'` : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "upgrade-insecure-requests"
  ].join("; ");
}

/**
 * @param {Response} response
 * @param {object} extraHeaders  - additional/override headers, e.g. a
 *   route-specific CSP (admin) or cache-control. If extraHeaders sets
 *   "content-security-policy" explicitly, that value wins over the
 *   nonce-based default below.
 * @param {string} [nonce] - per-request CSP nonce from generateNonce().
 *   Pass this on every public-page response so the header's
 *   'nonce-...' matches the <script nonce="..."> tag in the HTML body.
 *   Omitted for routes with no inline scripts (API/XML/text responses).
 */
export function withSecurityHeaders(response, extraHeaders = {}, nonce = null) {
  const headers = new Headers(response.headers);

  Object.entries(baseSecurityHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  headers.set("content-security-policy", contentSecurityPolicy(nonce));

  Object.entries(extraHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// Link response headers (RFC 8288) for agent discovery. Points agents at
// the sitemap (closest thing this storefront has to an API/content catalog)
// and at the machine-readable robots/AI-access rules. Applied on top of
// withSecurityHeaders so it rides along on every response, same as the
// security headers above.
export function withAgentDiscoveryHeaders(response, appConfig) {
  const headers = new Headers(response.headers);
  const origin = `https://${appConfig.domain}`;

  const existing = headers.get("link");
  const links = [
    `<${origin}/sitemap.xml>; rel="api-catalog"`,
    `<${origin}/robots.txt>; rel="service-doc"`
  ];
  headers.set("link", existing ? `${existing}, ${links.join(", ")}` : links.join(", "));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
