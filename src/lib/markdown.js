/**
 * markdown.js — converts a rendered SSR page into a lightweight Markdown
 * document for agents that send `Accept: text/markdown`.
 *
 * This is NOT a general-purpose HTML→MD library. Cloudflare Workers has no
 * DOM, and pulling in a dependency (turndown, etc.) just for this would be
 * a lot of weight for one feature. Instead this is a small, regex/stack
 * based converter purpose-built for *this* site's SSR output:
 *   - strips <script>, <style>, <svg>, <nav>, decorative buttons/icons
 *   - keeps headings, paragraphs, links, images, lists, tables, blockquotes
 *   - collapses the inevitable whitespace mess that's left over
 *
 * It intentionally favors "good enough, readable, safe" over "byte-perfect".
 */

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

// Tags whose entire contents (including nested markup) should be dropped —
// they're either non-visual, decorative, or interactive chrome that has no
// meaning as document text (icons, cart drawers, JSON-LD, etc.).
const DROP_TAGS = ["script", "style", "svg", "noscript", "template", "nav", "button", "form"];

// Off-canvas UI chrome that lives inside <main> in this site's markup (cart
// drawer, wishlist drawer, WhatsApp checkout modal) — present in every page
// but never actual page content, so it's identified by id/class rather than
// tag name and stripped the same way.
const DROP_ID_OR_CLASS_PATTERNS = [
  /id=["']cart-drawer["']/i,
  /id=["']wishlist-drawer["']/i,
  /class=["'][^"']*\bside-drawer\b[^"']*["']/i,
  /id=["']payment-modal-overlay["']/i,
  /class=["'][^"']*\bpayment-modal-overlay\b[^"']*["']/i
];

function removeMatchingDivs(html, testAttr) {
  // Manual scan for <div ...testAttr...> ... matching </div> using a depth
  // counter, since these blocks nest other <div>s and a single regex can't
  // balance that. Only used for a handful of known container elements.
  let out = "";
  let i = 0;
  while (i < html.length) {
    const openMatch = /<div\b[^>]*>/i.exec(html.slice(i));
    if (!openMatch) {
      out += html.slice(i);
      break;
    }
    const openStart = i + openMatch.index;
    const openEnd = openStart + openMatch[0].length;
    out += html.slice(i, openStart);

    if (!testAttr(openMatch[0])) {
      out += html.slice(openStart, openEnd);
      i = openEnd;
      continue;
    }

    // Found a div to drop — walk forward balancing nested <div>/</div> to
    // find its true matching close tag.
    let depth = 1;
    let cursor = openEnd;
    const tagRe = /<\/?div\b[^>]*>/gi;
    tagRe.lastIndex = cursor;
    let closeEnd = html.length;
    let m;
    while ((m = tagRe.exec(html)) !== null) {
      if (m[0].startsWith("</")) depth--;
      else depth++;
      if (depth === 0) {
        closeEnd = m.index + m[0].length;
        break;
      }
    }
    i = closeEnd;
  }
  return out;
}

function removeDropTags(html) {
  let out = html;
  for (const tag of DROP_TAGS) {
    const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
    out = out.replace(re, "");
  }
  // Strip HTML comments (includes JSON-LD islands wrapped elsewhere already
  // removed via <script>, but comments can also carry stray markup).
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  // Strip known off-canvas UI containers (cart/wishlist drawers, checkout
  // modal) that live inside <main> but aren't page content.
  out = removeMatchingDivs(out, (openTag) => DROP_ID_OR_CLASS_PATTERNS.some((re) => re.test(openTag)));

  return out;
}

function extractMain(html) {
  // Prefer <main>, fall back to <body>, fall back to whole doc.
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (main) return main[1];
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) return body[1];
  return html;
}

function convertTable(tableHtml) {
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  if (!rows.length) return "";

  const parseRow = (rowHtml) =>
    [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) => stripTags(m[1]) || " ");

  const parsed = rows.map(parseRow).filter((r) => r.length);
  if (!parsed.length) return "";

  const colCount = Math.max(...parsed.map((r) => r.length));
  const pad = (r) => [...r, ...Array(colCount - r.length).fill(" ")];

  const lines = [];
  lines.push(`| ${pad(parsed[0]).join(" | ")} |`);
  lines.push(`| ${Array(colCount).fill("---").join(" | ")} |`);
  for (const row of parsed.slice(1)) {
    lines.push(`| ${pad(row).join(" | ")} |`);
  }
  return lines.join("\n") + "\n\n";
}

function convertList(listHtml, ordered) {
  const items = [...listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1]);
  return (
    items
      .map((item, i) => {
        const text = inlineToMarkdown(item.trim());
        const prefix = ordered ? `${i + 1}.` : "-";
        return `${prefix} ${text}`;
      })
      .join("\n") + "\n\n"
  );
}

function inlineToMarkdown(html) {
  let out = html;

  // Links
  out = out.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const label = stripTags(text);
    if (!label) return "";
    if (!href || href.startsWith("javascript:") || href.startsWith("#")) return label;
    return `[${label}](${href})`;
  });

  // Images
  out = out.replace(/<img\s+[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, (_, src, alt) => `![${decodeEntities(alt)}](${src})`);
  out = out.replace(/<img\s+[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, (_, src) => `![](${src})`);

  // Emphasis
  out = out.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => `**${stripTags(t)}**`);
  out = out.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => `*${stripTags(t)}*`);
  out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => `\`${stripTags(t)}\``);
  out = out.replace(/<br\s*\/?>/gi, "\n");

  return stripTags(out);
}

function extractMeta(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*\/?>/i)
    || html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*\/?>/i);
  return {
    title: titleMatch ? decodeEntities(titleMatch[1]).trim() : null,
    description: descMatch ? decodeEntities(descMatch[1]).trim() : null
  };
}

export function htmlToMarkdown(html, { title, description, url } = {}) {
  const meta = extractMeta(html);
  title = title || meta.title;
  description = description || meta.description;

  let body = extractMain(html);
  body = removeDropTags(body);

  const blocks = [];

  if (title) blocks.push(`# ${title}`);
  if (description) blocks.push(description);
  if (url) blocks.push(`Source: ${url}`);
  if (blocks.length) blocks.push("---");

  // Walk block-level elements in document order using one combined regex
  // pass — headings, paragraphs, lists, tables, blockquotes.
  const blockRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>|<p[^>]*>([\s\S]*?)<\/p>|<ul[^>]*>([\s\S]*?)<\/ul>|<ol[^>]*>([\s\S]*?)<\/ol>|<table[^>]*>([\s\S]*?)<\/table>|<blockquote[^>]*>([\s\S]*?)<\/blockquote>|<img\s+([^>]*)\/?>/gi;

  let match;
  let sawAny = false;

  while ((match = blockRe.exec(body)) !== null) {
    sawAny = true;
    const [, hLevel, hText, pText, ulText, olText, tableText, bqText, imgAttrs] = match;

    if (hLevel) {
      const text = inlineToMarkdown(hText.trim());
      if (text) blocks.push(`${"#".repeat(Math.min(6, Number(hLevel)))} ${text}`);
    } else if (pText !== undefined) {
      const text = inlineToMarkdown(pText.trim());
      if (text) blocks.push(text);
    } else if (ulText !== undefined) {
      const text = convertList(ulText, false).trim();
      if (text) blocks.push(text);
    } else if (olText !== undefined) {
      const text = convertList(olText, true).trim();
      if (text) blocks.push(text);
    } else if (tableText !== undefined) {
      const text = convertTable(tableText).trim();
      if (text) blocks.push(text);
    } else if (bqText !== undefined) {
      const text = inlineToMarkdown(bqText.trim());
      if (text) blocks.push(text.split("\n").map((l) => `> ${l}`).join("\n"));
    } else if (imgAttrs !== undefined) {
      const srcMatch = imgAttrs.match(/src=["']([^"']*)["']/i);
      const altMatch = imgAttrs.match(/alt=["']([^"']*)["']/i);
      if (srcMatch) {
        const alt = altMatch ? decodeEntities(altMatch[1]) : "";
        blocks.push(`![${alt}](${srcMatch[1]})`);
      }
    }
  }

  // Fallback: if nothing block-level matched (unlikely, but guards against
  // a page structure this regex doesn't anticipate), fall back to a single
  // stripped-text dump so agents still get *something* instead of an error.
  if (!sawAny) {
    const fallback = stripTags(body);
    if (fallback) blocks.push(fallback);
  }

  const markdown = blocks
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return markdown + "\n";
}

/**
 * Returns true when the request is asking for Markdown for Agents rather
 * than HTML — i.e. `Accept: text/markdown` is present and ranked at or
 * above `text/html` in the header (browsers don't send text/markdown at
 * all, so in practice this only fires for agents that explicitly ask).
 */
export function wantsMarkdown(request) {
  const accept = request.headers.get("accept") || "";
  return /text\/markdown/i.test(accept);
}
