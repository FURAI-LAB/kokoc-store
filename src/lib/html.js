/**
 * html.js — single source of truth for HTML-escaping.
 *
 * Before this module existed, the same escaping logic was copy-pasted
 * across ~13 call sites (navbar.js ×2, seo.js, catalog.js, crocs.js,
 * adidas.js, product.js, landing.js, collabs.js, admin.js). One of those
 * copies (admin.js) drifted and forgot to escape the single-quote
 * character, which is exploitable wherever admin.js interpolates escaped
 * values inside a single-quoted HTML attribute such as
 * `onclick="doThing('${esc(value)}')"` — see CHANGELOG / security audit.
 *
 * Two flavours are exported because two different runtimes need them:
 *
 * 1. `escapeHtml(value)` — a real function, used directly in server-side
 *    (SSR) template literals while building the HTML response.
 *
 * 2. `CLIENT_ESC_HTML_SRC` — the *source code* of an equivalent function,
 *    as a string. Inline `<script>` blocks shipped to the browser are
 *    built as JS template-literal strings on the server (they are not
 *    bundled/imported), so they cannot `import` this module — the only
 *    way to share the implementation is to inject its source text once
 *    per page. Pages that build a client-side script should include
 *    `${CLIENT_ESC_HTML_SRC}` near the top of the IIFE and then call
 *    `clientEscHtml(...)` like a normal local function.
 */

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Alias kept for call sites that historically used `escAttr` (attribute
// escaping and HTML-body escaping are the same operation here — we always
// escape all five characters rather than maintaining two slightly
// different escapers).
export const escapeAttr = escapeHtml;

export const CLIENT_ESC_HTML_SRC = `function clientEscHtml(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }`;
