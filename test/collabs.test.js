import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { handleRequest } from "../src/server.js";
import { makeEnv, setupTestDatabase, PRODUCT_IDS, ruRequest } from "./fixtures.js";

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);

describe("/collabs list page", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("renders active collabs with a link to their detail page", async () => {
    const res = await handleRequest(request("/collabs"), makeEnv(), {});
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain("Crocs Classic");
    expect(html).toContain('href="/collabs/crocs-classic"');
  });

  it("shows a product count badge once a product is tagged for the collab", async () => {
    await env.DB.prepare(
      `UPDATE products SET tags = 'crocs,classic,summer,collab-crocs-classic' WHERE id = ?`
    ).bind(PRODUCT_IDS.classic).run();

    const res = await handleRequest(ruRequest("/collabs"), makeEnv(), {});
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain("1 товар");
  });

  it("omits the count badge when no products are tagged for a collab", async () => {
    const res = await handleRequest(request("/collabs"), makeEnv(), {});
    const html = await res.text();

    expect(res.status).toBe(200);
    // The CSS rule for .collab-count always ships in <style>; what matters
    // is that no rendered <span class="collab-count"> markup appears.
    expect(html).not.toContain('<span class="collab-count">');
  });
});

describe("/collabs/:slug detail page", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("returns 404 for an unknown collab slug", async () => {
    const res = await handleRequest(request("/collabs/does-not-exist"), makeEnv(), {});
    expect(res.status).toBe(404);
  });

  it("renders the collab banner and story for a known slug", async () => {
    const res = await handleRequest(request("/collabs/crocs-classic"), makeEnv(), {});
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain("Crocs Classic");
    expect(html).toContain('href="/collabs"');
  });

  it("lists only active products tagged with the collab's product tag", async () => {
    await env.DB.prepare(
      `UPDATE products SET tags = 'crocs,classic,summer,collab-crocs-classic' WHERE id = ?`
    ).bind(PRODUCT_IDS.classic).run();

    const res = await handleRequest(request("/collabs/crocs-classic"), makeEnv(), {});
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain("Classic Clog");
    expect(html).toContain('href="/product/classic-clog"');
    // Platform Clog carries no collab tag and must not appear.
    expect(html).not.toContain("Platform Clog");
    // Hidden Clog is a draft and must never surface even if tagged.
    expect(html).not.toContain("Hidden Clog");
  });

  it("shows an empty state when no products are tagged for the collab yet", async () => {
    const res = await handleRequest(ruRequest("/collabs/crocs-classic"), makeEnv(), {});
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain("Товаров пока нет");
  });

  it("does not leak draft products even when draft product carries the collab tag", async () => {
    await env.DB.prepare(
      `UPDATE products SET tags = 'crocs,collab-crocs-classic' WHERE id = ?`
    ).bind(PRODUCT_IDS.draft).run();

    const res = await handleRequest(request("/collabs/crocs-classic"), makeEnv(), {});
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).not.toContain("Hidden Clog");
  });
});
