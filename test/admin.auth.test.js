import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import { handleRequest } from "../src/server.js";
import { timingSafeEqual } from "../src/routes/admin/auth.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);
const json = (response) => response.json();

function loginEnv(overrides = {}) {
  return makeEnv({
    KV: env.KV,
    ADMIN_PASSWORD: "correct-horse-battery-staple",
    ADMIN_SECRET: "a".repeat(32),
    ...overrides
  });
}

/**
 * admin.auth.test.js
 *
 * Covers two issues found in a security audit of the admin login flow:
 *
 * 1. /admin/login had no rate limiting at all, even though the project's
 *    rateLimit() helper (lib/ratelimit.js) was already used elsewhere
 *    (subscribe, reviews) — making env.ADMIN_PASSWORD brute-forceable
 *    over the network with no friction.
 *
 * 2. Both the password check (body.password !== env.ADMIN_PASSWORD) and
 *    the session-cookie HMAC check (sig === expected) used plain `===`,
 *    which is not constant-time and can in principle leak information
 *    about the secret via response-timing differences.
 */
describe("admin login — rate limiting", () => {
  beforeEach(async () => {
    await setupTestDatabase();
    // rateLimit() buckets are keyed by ip-hash + bucket name in KV; clear
    // any leftover state between tests by using a fresh IP per test instead
    // of relying on TTL expiry.
  });

  it("allows a correct password through", async () => {
    const response = await handleRequest(
      request("/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.1" },
        body: JSON.stringify({ password: "correct-horse-battery-staple" })
      }),
      loginEnv(),
      {}
    );
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({ ok: true });
    expect(response.headers.get("set-cookie")).toContain("kokoc_admin=");
  });

  it("rejects a wrong password with 401", async () => {
    const response = await handleRequest(
      request("/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.2" },
        body: JSON.stringify({ password: "totally-wrong" })
      }),
      loginEnv(),
      {}
    );
    expect(response.status).toBe(401);
    expect(await json(response)).toMatchObject({ ok: false });
  });

  it("rate-limits repeated wrong-password attempts from the same IP", async () => {
    const ip = "203.0.113.3";
    const attempt = () =>
      handleRequest(
        request("/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
          body: JSON.stringify({ password: "guess-" + Math.random() })
        }),
        loginEnv(),
        {}
      );

    const statuses = [];
    for (let i = 0; i < 12; i++) {
      const res = await attempt();
      statuses.push(res.status);
    }

    // First 10 attempts get a real 401 (wrong password); after that the
    // rate limiter should kick in and return 429 regardless of password.
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(statuses.slice(10)).toEqual(Array(2).fill(429));
  });

  it("does not rate-limit a different IP after another IP is exhausted", async () => {
    const exhaustedIp = "203.0.113.4";
    for (let i = 0; i < 10; i++) {
      await handleRequest(
        request("/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json", "CF-Connecting-IP": exhaustedIp },
          body: JSON.stringify({ password: "wrong" })
        }),
        loginEnv(),
        {}
      );
    }

    const blockedResponse = await handleRequest(
      request("/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "CF-Connecting-IP": exhaustedIp },
        body: JSON.stringify({ password: "correct-horse-battery-staple" })
      }),
      loginEnv(),
      {}
    );
    expect(blockedResponse.status).toBe(429);

    const freshIpResponse = await handleRequest(
      request("/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.5" },
        body: JSON.stringify({ password: "correct-horse-battery-staple" })
      }),
      loginEnv(),
      {}
    );
    expect(freshIpResponse.status).toBe(200);
  });
});

describe("timingSafeEqual", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqual("hello-world", "hello-world")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeEqual("hello-world", "hello-worle")).toBe(false);
  });

  it("returns false for different-length strings without throwing", () => {
    expect(() => timingSafeEqual("short", "a-much-longer-value")).not.toThrow();
    expect(timingSafeEqual("short", "a-much-longer-value")).toBe(false);
  });

  it("returns false when compared against undefined/null", () => {
    expect(timingSafeEqual(undefined, "secret")).toBe(false);
    expect(timingSafeEqual(null, "secret")).toBe(false);
  });
});
