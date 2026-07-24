import { describe, expect, it } from "vitest";
import { sanitizeDescriptionHtml, stripHtmlToText } from "../src/lib/rich-text.js";

describe("sanitizeDescriptionHtml", () => {
  it("returns null for null/empty/whitespace-only input", () => {
    expect(sanitizeDescriptionHtml(null)).toBeNull();
    expect(sanitizeDescriptionHtml(undefined)).toBeNull();
    expect(sanitizeDescriptionHtml("")).toBeNull();
    expect(sanitizeDescriptionHtml("   \n  ")).toBeNull();
  });

  it("keeps allow-listed tags untouched", () => {
    const html = "<p>Удобные сабо для <strong>повседневной</strong> носки.</p>";
    expect(sanitizeDescriptionHtml(html)).toBe(html);
  });

  it("keeps h3, em, ul/li, and normalizes br to a self-closed form", () => {
    const html = "<h3>Материал</h3><p>Мягкий <em>Croslite</em>.<br></p><ul><li>Пункт один</li><li>Пункт два</li></ul>";
    expect(sanitizeDescriptionHtml(html)).toBe(
      "<h3>Материал</h3><p>Мягкий <em>Croslite</em>.<br></p><ul><li>Пункт один</li><li>Пункт два</li></ul>"
    );
  });

  it("strips disallowed tags but keeps their text content", () => {
    const html = '<div class="x"><span>hello</span> <a href="https://evil.example">world</a></div>';
    expect(sanitizeDescriptionHtml(html)).toBe("hello world");
  });

  it("strips all attributes even on allowed tags (except the text-align allowlist below)", () => {
    const html = '<p style="color:red" onclick="alert(1)">text</p>';
    expect(sanitizeDescriptionHtml(html)).toBe("<p>text</p>");
  });

  it("keeps a text-align style on p/h3 when it's exactly one of the four allowed values", () => {
    expect(sanitizeDescriptionHtml('<p style="text-align: center">Центр</p>')).toBe(
      '<p style="text-align:center">Центр</p>'
    );
    expect(sanitizeDescriptionHtml('<p style="text-align:right;">Справа</p>')).toBe(
      '<p style="text-align:right">Справа</p>'
    );
    expect(sanitizeDescriptionHtml("<h3 style='text-align:justify'>Заголовок</h3>")).toBe(
      '<h3 style="text-align:justify">Заголовок</h3>'
    );
    expect(sanitizeDescriptionHtml('<p style="text-align:left">Слева</p>')).toBe(
      '<p style="text-align:left">Слева</p>'
    );
  });

  it("does not carry text-align onto tags other than p/h3", () => {
    // execCommand never produces this shape, but the sanitizer's allowlist
    // should still be tag-specific, not "any tag with this exact style".
    expect(sanitizeDescriptionHtml('<strong style="text-align:center">bold</strong>')).toBe(
      "<strong>bold</strong>"
    );
    expect(sanitizeDescriptionHtml('<li style="text-align:center">item</li>')).toBe("<li>item</li>");
  });

  it("drops a style attribute that mixes text-align with anything else, rather than partially applying it", () => {
    expect(sanitizeDescriptionHtml('<p style="text-align:center;color:red">x</p>')).toBe("<p>x</p>");
    expect(sanitizeDescriptionHtml('<p style="color:red;text-align:center">x</p>')).toBe("<p>x</p>");
  });

  it("rejects a text-align value outside the fixed keyword set — e.g. CSS injection via the value", () => {
    expect(sanitizeDescriptionHtml('<p style="text-align:url(javascript:alert(1))">x</p>')).toBe("<p>x</p>");
    expect(sanitizeDescriptionHtml('<p style="text-align: center; background:url(x)">x</p>')).toBe("<p>x</p>");
  });

  it("drops script tags and their content entirely", () => {
    const html = "<p>before</p><script>alert(document.cookie)</script><p>after</p>";
    expect(sanitizeDescriptionHtml(html)).toBe("<p>before</p><p>after</p>");
  });

  it("drops style tags and their content entirely", () => {
    const html = "<style>body{background:url(javascript:alert(1))}</style><p>text</p>";
    expect(sanitizeDescriptionHtml(html)).toBe("<p>text</p>");
  });

  it("neutralizes an img onerror XSS payload — tag stripped, no attributes survive", () => {
    const html = '<img src="x" onerror="alert(1)">after';
    const out = sanitizeDescriptionHtml(html);
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("<img");
    expect(out).toContain("after");
  });

  it("neutralizes a javascript: href — the whole <a> tag is dropped, not just its href", () => {
    const html = '<a href="javascript:alert(1)">click me</a>';
    const out = sanitizeDescriptionHtml(html);
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("<a");
    expect(out).toBe("click me");
  });

  it("removes HTML comments", () => {
    const html = "<p>visible</p><!-- secret admin note -->";
    expect(sanitizeDescriptionHtml(html)).toBe("<p>visible</p>");
  });

  it("encodes stray angle-bracket text so it can't be reinterpreted as markup", () => {
    const html = "<p>5 > 4 and 3 < 5</p>";
    const out = sanitizeDescriptionHtml(html);
    // The literal ">" and "<" that aren't part of a real tag must come
    // out entity-encoded, not as bare characters a browser could later
    // reinterpret as the start of new markup.
    expect(out).toBe("<p>5 &gt; 4 and 3 &lt; 5</p>");
  });

  it("closes tags case-insensitively and normalizes tag name casing", () => {
    const html = "<P>text</P><STRONG>bold</STRONG>";
    expect(sanitizeDescriptionHtml(html)).toBe("<p>text</p><strong>bold</strong>");
  });
});

describe("stripHtmlToText", () => {
  it("returns empty string for null/undefined", () => {
    expect(stripHtmlToText(null)).toBe("");
    expect(stripHtmlToText(undefined)).toBe("");
  });

  it("strips tags and joins block-level content with spaces", () => {
    const html = "<h3>Материал</h3><p>Мягкий Croslite.</p><ul><li>Пункт один</li><li>Пункт два</li></ul>";
    expect(stripHtmlToText(html)).toBe("Материал Мягкий Croslite. Пункт один Пункт два");
  });

  it("decodes entities back to plain characters", () => {
    expect(stripHtmlToText("<p>Rock &amp; Roll &mdash; &quot;quoted&quot;</p>")).toBe(
      'Rock & Roll &mdash; "quoted"'
    );
  });

  it("collapses whitespace produced by stripped tags", () => {
    const html = "<p>one</p>\n<p>two</p>";
    expect(stripHtmlToText(html)).toBe("one two");
  });
});
