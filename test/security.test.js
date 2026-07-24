import { describe, expect, it } from "vitest";
import { generateNonce, withSecurityHeaders, withAgentDiscoveryHeaders } from "../src/lib/security.js";

describe("generateNonce", () => {
  it("returns a non-empty string", () => {
    const nonce = generateNonce();
    expect(typeof nonce).toBe("string");
    expect(nonce.length).toBeGreaterThan(0);
  });

  it("returns a different value on every call", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
  });
});

describe("withSecurityHeaders — CSP", () => {
  it("uses the per-request nonce in script-src and omits unsafe-inline for scripts", () => {
    const res = withSecurityHeaders(new Response("ok"), {}, "test-nonce-123");
    const csp = res.headers.get("content-security-policy");

    expect(csp).toContain("script-src 'self' 'nonce-test-nonce-123'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("falls back to script-src 'self' with no unsafe-inline when no nonce is given", () => {
    const res = withSecurityHeaders(new Response("ok"));
    const csp = res.headers.get("content-security-policy");

    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).not.toContain("nonce-");
  });

  it("still allows inline styles (style-src unaffected by nonce logic)", () => {
    const res = withSecurityHeaders(new Response("ok"), {}, "abc");
    const csp = res.headers.get("content-security-policy");

    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("lets an explicit content-security-policy in extraHeaders override the nonce-based default", () => {
    const res = withSecurityHeaders(new Response("ok"), {
      "content-security-policy": "default-src 'none'"
    }, "abc");

    expect(res.headers.get("content-security-policy")).toBe("default-src 'none'");
  });

  it("still sets the other baseline security headers", () => {
    const res = withSecurityHeaders(new Response("ok"), {}, "abc");

    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=31536000");
  });

  it("preserves response status and body", async () => {
    const res = withSecurityHeaders(new Response("hello", { status: 404 }), {}, "abc");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("hello");
  });
});

describe("withAgentDiscoveryHeaders", () => {
  it("adds a Link header pointing at sitemap and robots", async () => {
    const appConfig = { domain: "kokoc.store" };
    const res = withAgentDiscoveryHeaders(new Response("ok"), appConfig);
    const link = res.headers.get("link");

    expect(link).toContain('rel="api-catalog"');
    expect(link).toContain('rel="service-doc"');
  });
});
