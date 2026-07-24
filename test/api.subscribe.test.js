import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import { appConfig } from "../src/config/app.js";
import { handleApiRequest } from "../src/routes/api/index.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);
const json = async (response) => response.json();

function makeCtx() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(promise);
    }
  };
}

describe("subscribe API", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("stores a normalized subscriber email", async () => {
    const ctx = makeCtx();
    const response = await handleApiRequest(
      request("/api/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "203.0.113.10"
        },
        body: JSON.stringify({ email: "  TEST@Example.COM  " })
      }),
      makeEnv(),
      appConfig,
      ctx
    );
    const body = await json(response);
    const subscriber = await env.DB.prepare(
      "SELECT email, source, ip_hash FROM subscribers WHERE email = ?"
    ).bind("test@example.com").first();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ ok: true, message: "You're subscribed" });
    expect(subscriber).toMatchObject({
      email: "test@example.com",
      source: "newsletter"
    });
    expect(subscriber.ip_hash).toHaveLength(16);
    expect(ctx.pending).toHaveLength(1);
  });

  it("handles invalid and duplicate emails", async () => {
    const invalidResponse = await handleApiRequest(
      request("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" })
      }),
      makeEnv(),
      appConfig,
      makeCtx()
    );

    const firstResponse = await handleApiRequest(
      request("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "friend@example.com" })
      }),
      makeEnv(),
      appConfig,
      makeCtx()
    );
    const duplicateResponse = await handleApiRequest(
      request("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "friend@example.com" })
      }),
      makeEnv(),
      appConfig,
      makeCtx()
    );

    expect(invalidResponse.status).toBe(400);
    expect(await json(invalidResponse)).toMatchObject({ ok: false, error: "Invalid email" });
    expect(firstResponse.status).toBe(201);
    expect(duplicateResponse.status).toBe(200);
    expect(await json(duplicateResponse)).toMatchObject({
      ok: true,
      message: "Already subscribed"
    });
  });
});
