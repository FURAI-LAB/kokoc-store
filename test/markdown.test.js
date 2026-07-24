import { describe, expect, it } from "vitest";
import { htmlToMarkdown, wantsMarkdown } from "../src/lib/markdown.js";

describe("wantsMarkdown", () => {
  it("returns true when Accept includes text/markdown", () => {
    const req = new Request("https://kokoc.store/", { headers: { accept: "text/markdown" } });
    expect(wantsMarkdown(req)).toBe(true);
  });

  it("returns true when text/markdown is one of several accepted types", () => {
    const req = new Request("https://kokoc.store/", {
      headers: { accept: "text/html,text/markdown;q=0.9,*/*" }
    });
    expect(wantsMarkdown(req)).toBe(true);
  });

  it("returns false for a normal browser Accept header", () => {
    const req = new Request("https://kokoc.store/", {
      headers: { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
    });
    expect(wantsMarkdown(req)).toBe(false);
  });

  it("returns false when there is no Accept header at all", () => {
    const req = new Request("https://kokoc.store/");
    expect(wantsMarkdown(req)).toBe(false);
  });
});

describe("htmlToMarkdown", () => {
  it("converts headings and paragraphs", () => {
    const html = `<html><head><title>Test Page</title></head><body><main>
      <h1>Hello World</h1>
      <p>This is a paragraph.</p>
    </main></body></html>`;
    const md = htmlToMarkdown(html);
    expect(md).toContain("# Test Page");
    expect(md).toContain("# Hello World");
    expect(md).toContain("This is a paragraph.");
  });

  it("strips script, style, svg and nav tags entirely", () => {
    const html = `<main>
      <nav><a href="/x">Nav link</a></nav>
      <script>alert('x')</script>
      <style>.a { color: red; }</style>
      <svg><path d="M0 0"/></svg>
      <p>Real content</p>
    </main>`;
    const md = htmlToMarkdown(html);
    expect(md).not.toContain("Nav link");
    expect(md).not.toContain("alert(");
    expect(md).not.toContain("color: red");
    expect(md).not.toContain("<path");
    expect(md).toContain("Real content");
  });

  it("converts links preserving href and label", () => {
    const html = `<main><p><a href="/product/foo">Buy shoes</a></p></main>`;
    const md = htmlToMarkdown(html);
    expect(md).toContain("[Buy shoes](/product/foo)");
  });

  it("converts images with alt text", () => {
    const html = `<main><img src="/img/shoe.jpg" alt="Red shoe" /></main>`;
    const md = htmlToMarkdown(html);
    expect(md).toContain("![Red shoe](/img/shoe.jpg)");
  });

  it("converts unordered and ordered lists", () => {
    const html = `<main>
      <ul><li>First</li><li>Second</li></ul>
      <ol><li>Step one</li><li>Step two</li></ol>
    </main>`;
    const md = htmlToMarkdown(html);
    expect(md).toContain("- First");
    expect(md).toContain("- Second");
    expect(md).toContain("1. Step one");
    expect(md).toContain("2. Step two");
  });

  it("converts simple tables", () => {
    const html = `<main><table>
      <tr><th>Size</th><th>Price</th></tr>
      <tr><td>42</td><td>3000</td></tr>
    </table></main>`;
    const md = htmlToMarkdown(html);
    expect(md).toContain("| Size | Price |");
    expect(md).toContain("| 42 | 3000 |");
  });

  it("decodes common HTML entities", () => {
    const html = `<main><p>Crocs &amp; Jibbitz &mdash; &laquo;new&raquo;</p></main>`;
    const md = htmlToMarkdown(html);
    expect(md).toContain("Crocs & Jibbitz — «new»");
  });

  it("extracts title and description from meta tags", () => {
    const html = `<html><head>
      <title>Crocs Classic Clog</title>
      <meta name="description" content="Comfortable clogs from Vietnam">
    </head><body><main><p>Body text</p></main></body></html>`;
    const md = htmlToMarkdown(html);
    expect(md).toContain("# Crocs Classic Clog");
    expect(md).toContain("Comfortable clogs from Vietnam");
  });

  it("does not throw on a page with no <main> tag", () => {
    const html = `<html><body><p>Just body content</p></body></html>`;
    expect(() => htmlToMarkdown(html)).not.toThrow();
    expect(htmlToMarkdown(html)).toContain("Just body content");
  });

  it("drops button and form chrome (cart drawers, search forms, etc.)", () => {
    const html = `<main>
      <form><button type="submit">Add to cart</button></form>
      <p>Product description here</p>
    </main>`;
    const md = htmlToMarkdown(html);
    expect(md).not.toContain("Add to cart");
    expect(md).toContain("Product description here");
  });
});
