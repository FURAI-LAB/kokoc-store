import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest } from "../src/server.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);

describe("agent-discovery Link headers (RFC 8288)", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("adds a Link header on the homepage pointing at the sitemap and robots.txt", async () => {
    const res = await handleRequest(request("/"), makeEnv(), {});
    const link = res.headers.get("link");
    expect(link).toBeTruthy();
    expect(link).toContain('<https://kokoc.store/sitemap.xml>; rel="api-catalog"');
    expect(link).toContain('<https://kokoc.store/robots.txt>; rel="service-doc"');
  });

  it("adds the Link header on catalog and product pages too", async () => {
    const catalogRes = await handleRequest(request("/catalog"), makeEnv(), {});
    expect(catalogRes.headers.get("link")).toContain("api-catalog");

    const productRes = await handleRequest(request("/product/classic-clog"), makeEnv(), {});
    expect(productRes.headers.get("link")).toContain("api-catalog");
  });

  it("does not add the Link header on admin routes", async () => {
    const res = await handleRequest(request("/admin"), makeEnv(), {});
    expect(res.headers.get("link")).toBeFalsy();
  });

  it("does not add the Link header on API routes", async () => {
    const res = await handleRequest(request("/api/health"), makeEnv(), {});
    expect(res.headers.get("link")).toBeFalsy();
  });
});

describe("Markdown for Agents content negotiation", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("serves HTML by default (no Accept header)", async () => {
    const res = await handleRequest(request("/"), makeEnv(), {});
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("serves HTML to a normal browser Accept header", async () => {
    const res = await handleRequest(
      request("/", { headers: { accept: "text/html,application/xhtml+xml,*/*;q=0.8" } }),
      makeEnv(),
      {}
    );
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("serves Markdown when Accept: text/markdown is sent", async () => {
    const res = await handleRequest(
      request("/", { headers: { accept: "text/markdown" } }),
      makeEnv(),
      {}
    );
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const body = await res.text();
    expect(body).not.toContain("<html");
    expect(body).not.toContain("<script");
  });

  it("serves Markdown for the catalog page with product content intact", async () => {
    const res = await handleRequest(
      request("/catalog", { headers: { accept: "text/markdown" } }),
      makeEnv(),
      {}
    );
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const body = await res.text();
    expect(body).not.toContain("<div");
  });

  it("serves Markdown for a product detail page", async () => {
    const res = await handleRequest(
      request("/product/classic-clog", { headers: { accept: "text/markdown" } }),
      makeEnv(),
      {}
    );
    expect(res.headers.get("content-type")).toContain("text/markdown");
  });

  it("sets Vary: Accept on negotiated responses", async () => {
    const res = await handleRequest(request("/"), makeEnv(), {});
    expect(res.headers.get("vary")).toContain("Accept");
  });

  it("still applies security headers to Markdown responses", async () => {
    const res = await handleRequest(
      request("/", { headers: { accept: "text/markdown" } }),
      makeEnv(),
      {}
    );
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
