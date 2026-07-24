import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest } from "../src/server.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";

/**
 * End-to-end check that the CSP nonce wiring in server.js actually lines
 * up with what render*Page() emits — unit tests on security.js and
 * seo.js check each piece in isolation, this confirms they agree on the
 * same nonce for a real response.
 */
describe("nonce integration sanity check", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("landing page: script nonce attr matches CSP header nonce", async () => {
    const res = await handleRequest(new Request("https://kokoc.store/"), makeEnv(), {});
    const csp = res.headers.get("content-security-policy");
    const nonceMatch = csp.match(/'nonce-([^']+)'/);
    expect(nonceMatch).toBeTruthy();
    const nonce = nonceMatch[1];

    const html = await res.text();
    expect(html).toContain(`<script nonce="${nonce}">`);
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("product 404 page: script nonce attr matches CSP header nonce", async () => {
    const res = await handleRequest(new Request("https://kokoc.store/product/does-not-exist"), makeEnv(), {});
    expect(res.status).toBe(404);
    const csp = res.headers.get("content-security-policy");
    const nonceMatch = csp.match(/'nonce-([^']+)'/);
    expect(nonceMatch).toBeTruthy();
    const nonce = nonceMatch[1];

    const html = await res.text();
    expect(html).toContain(`<script nonce="${nonce}">`);
  });

  it("catalog page: json-ld script tags carry the nonce too", async () => {
    const res = await handleRequest(new Request("https://kokoc.store/catalog"), makeEnv(), {});
    const csp = res.headers.get("content-security-policy");
    const nonce = csp.match(/'nonce-([^']+)'/)[1];
    const html = await res.text();
    expect(html).toContain(`type="application/ld+json" nonce="${nonce}"`);
  });

  it("two consecutive requests get two different nonces (per-request, not cached/shared)", async () => {
    const res1 = await handleRequest(new Request("https://kokoc.store/"), makeEnv(), {});
    const res2 = await handleRequest(new Request("https://kokoc.store/"), makeEnv(), {});
    const n1 = res1.headers.get("content-security-policy").match(/'nonce-([^']+)'/)[1];
    const n2 = res2.headers.get("content-security-policy").match(/'nonce-([^']+)'/)[1];
    expect(n1).not.toBe(n2);
  });

  it("admin route keeps its own CSP untouched (still unsafe-inline, separate concern)", async () => {
    const res = await handleRequest(new Request("https://kokoc.store/admin/login"), makeEnv(), {});
    const csp = res.headers.get("content-security-policy");
    expect(csp).toContain("unsafe-inline");
  });
});
