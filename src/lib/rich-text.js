/**
 * rich-text.js — sanitizer for the product "description" rich-text field.
 *
 * The admin item-form description field is a contenteditable-based editor
 * (bold, italic, H3 heading, paragraphs, bullet list). It produces a small,
 * known set of HTML tags. That HTML is stored in `products.description` and
 * later injected as-is into the storefront product page (no further
 * escaping — the whole point is to render the formatting).
 *
 * Because this HTML is admin-authored (not from public visitors), the risk
 * model is lower than the historical stored-XSS issues found in the
 * security audit (those were public review/search/cart data). Still, an
 * admin session could be compromised (XSS elsewhere, stolen cookie, a
 * malicious paste from a scraped competitor description, etc.), so the
 * value is sanitized server-side before it ever reaches the database —
 * defense in depth, same principle as the CSP/escAttr work from the same
 * audit.
 *
 * sanitizeDescriptionHtml() runs a strict allow-list pass:
 *   - Allowed tags: p, h3, strong, em, ul, li, br
 *   - The only attribute allowed at all is a `style` on <p>/<h3> that
 *     contains nothing but `text-align: left|center|right|justify`
 *     (the admin toolbar's alignment buttons) — every other attribute
 *     on every tag, including style with any other property or value,
 *     is stripped. This still rules out the entire "attribute-based
 *     XSS" class (onerror=, javascript: hrefs, arbitrary style
 *     expressions/url()/etc.) because the text-align value is checked
 *     against a fixed set of four keywords, not passed through.
 *   - Every other tag is stripped (its text content is kept, its own
 *     attributes and the tag markup are removed)
 *   - <script>/<style> content is dropped entirely, not just unwrapped,
 *     so their inner text can't leak into the page as plain text either
 *   - HTML comments and any `<!...>` / `<?...>` markup are removed
 *
 * This is a small hand-rolled allow-list scanner rather than a DOM-based
 * sanitizer (e.g. DOMPurify) because Cloudflare Workers has no DOM/
 * innerHTML available server-side. A regex/state-machine allow-list is
 * the standard approach for this constraint and is safe as long as it is
 * strict: allow-list tags, allow-list the one style value verbatim
 * rather than passing through attacker-controlled CSS, and entity-encode
 * any raw `<`/`>`/`&` that isn't part of a recognized tag.
 */

const ALLOWED_TAGS = new Set(["p", "h3", "strong", "em", "ul", "li", "br"]);

// Tags that may carry the one allowed style: text-align, from the admin
// toolbar's alignment buttons (justifyLeft/Center/Right/Full via
// execCommand, which browsers implement as a `style="text-align: ..."`
// on the enclosing block element).
const ALIGNABLE_TAGS = new Set(["p", "h3"]);
const ALLOWED_ALIGN_VALUES = new Set(["left", "center", "right", "justify"]);

// Tags whose *content* must be discarded entirely if they somehow appear
// (defense in depth — should never survive the allow-list below anyway,
// but guarantees "<script>alert(1)</script>" can't degrade into the text
// "alert(1)" being kept as visible page content).
const STRIP_CONTENT_TAGS = /<(script|style)[^>]*>[\s\S]*?<\/\1\s*>/gi;

function encodeEntities(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Extracts a safe text-align value from a tag's raw attribute string, or
// null if there isn't one. Deliberately narrow: only a `style` attribute
// whose value — once whitespace-normalized — is exactly
// `text-align: <one of the four keywords>` (optional trailing `;`, either
// quote style) counts. Anything else about the style attribute (another
// property, a second declaration, url()/expression()/calc(), etc.) is
// treated as "no match" and the whole attribute is dropped by the caller,
// not partially applied — there's no attempt to "clean up" the CSS here.
function extractTextAlign(attrString) {
  const m = attrString.match(/\bstyle\s*=\s*(["'])([^"']*)\1/i);
  if (!m) return null;
  const styleValue = m[2].trim().replace(/;\s*$/, "");
  const decl = styleValue.match(/^text-align\s*:\s*([a-zA-Z]+)$/);
  if (!decl) return null;
  const value = decl[1].toLowerCase();
  return ALLOWED_ALIGN_VALUES.has(value) ? value : null;
}

/**
 * Sanitize admin-authored rich-text HTML down to a strict allow-list.
 * Returns null/empty input unchanged (caller already treats
 * null/"" as "no description").
 */
export function sanitizeDescriptionHtml(html) {
  if (html == null) return null;
  let src = String(html);
  if (!src.trim()) return null;

  // Drop <script>/<style> blocks (and their content) up front.
  src = src.replace(STRIP_CONTENT_TAGS, "");

  // Remove comments and doctype/processing-instruction-like markup.
  src = src.replace(/<!--[\s\S]*?-->/g, "");
  src = src.replace(/<![^>]*>/g, "");
  src = src.replace(/<\?[\s\S]*?\?>/g, "");

  let out = "";
  let i = 0;
  const len = src.length;

  while (i < len) {
    const lt = src.indexOf("<", i);
    if (lt === -1) {
      out += encodeEntities(src.slice(i));
      break;
    }
    // Text before the tag.
    out += encodeEntities(src.slice(i, lt));

    const gt = src.indexOf(">", lt);
    if (gt === -1) {
      // Unterminated "<" — encode the rest literally and stop.
      out += encodeEntities(src.slice(lt));
      break;
    }

    const rawTag = src.slice(lt, gt + 1); // e.g. "</p>" or "<strong>" or "<br/>"
    const m = rawTag.match(/^<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>$/);

    if (m) {
      const isClosing = !!m[1];
      const tagName = m[2].toLowerCase();
      const attrString = m[3] || "";
      if (ALLOWED_TAGS.has(tagName)) {
        if (tagName === "br") {
          out += "<br>";
        } else if (!isClosing && ALIGNABLE_TAGS.has(tagName)) {
          const align = extractTextAlign(attrString);
          out += align ? `<${tagName} style="text-align:${align}">` : `<${tagName}>`;
        } else {
          out += isClosing ? `</${tagName}>` : `<${tagName}>`;
        }
      }
      // Disallowed tag: drop the tag markup entirely, keep scanning —
      // its text content (handled on the next loop iterations) survives
      // as plain escaped text.
    } else {
      // Didn't parse as a tag at all (e.g. a lone "<" from something like
      // "3 < 5"). Encode just the "<" and resume scanning from right
      // after it — NOT from after the next ">" — so a real tag further
      // along the string (e.g. the "</p>" in "3 < 5</p>") is still found
      // and parsed on a later iteration instead of being swallowed as
      // plain text along with everything in between.
      out += "&lt;";
      i = lt + 1;
      continue;
    }

    i = gt + 1;
  }

  const trimmed = out.trim();
  return trimmed ? trimmed : null;
}

/**
 * Plain-text version of a sanitized description, for contexts that need
 * text only — <meta name="description">, og:description, JSON-LD
 * "description" — where raw tags like "<h3>" or "&amp;" showing up in a
 * search snippet would look broken. Block-level tags (p, li) become a
 * single space so words from adjacent blocks don't get glued together;
 * everything else is just stripped. Entities are decoded back to plain
 * characters.
 */
export function stripHtmlToText(html) {
  if (html == null) return "";
  return String(html)
    .replace(/<\/(p|li|h3)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
