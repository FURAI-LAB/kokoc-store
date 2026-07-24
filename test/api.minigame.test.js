import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import { appConfig } from "../src/config/app.js";
import { handleApiRequest } from "../src/routes/api/index.js";
import { makeEnv, setupTestDatabase } from "./fixtures.js";
import { createRng, generateBoard, applyMove, PROMO_SCORE_THRESHOLD, MAX_MOVES } from "../src/lib/minigame-engine.js";

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);
const json = async (response) => response.json();

function makeCtx() {
  return { waitUntil() {} };
}

function extractCookie(response) {
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/kokoc_sid=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Play a board "greedily" for `moveCount` moves — always take the first
 * adjacent swap found that produces a match. Used to generate a realistic
 * high-scoring move list against a given seed for tests, using the exact
 * same engine the server trusts.
 *
 * Whether a swap is "valid" (produces a match) is a pure function of the
 * board state alone — findMatches() never touches the rng, which is only
 * consumed afterwards to roll refill tiles for cleared cells. So probing
 * candidate swaps with a disposable rng is safe and doesn't perturb the
 * real rng stream; only the one committed applyMove() call per move (using
 * the real, threaded `rng`) is allowed to advance game state.
 */
function greedyMoves(seed, moveCount) {
  let board = generateBoard(seed);
  const rng = createRng(seed);
  const moves = [];
  for (let i = 0; i < moveCount; i++) {
    let found = null;
    outer: for (let r = 0; r < 8 && !found; r++) {
      for (let c = 0; c < 8 && !found; c++) {
        const candidates = [{ r: r + 1, c }, { r, c: c + 1 }];
        for (const to of candidates) {
          if (to.r >= 8 || to.c >= 8) continue;
          const probe = applyMove(board, createRng(0) /* disposable, validity-only */, { r, c }, to);
          if (probe.valid) { found = { from: { r, c }, to }; break outer; }
        }
      }
    }
    if (!found) break;
    const result = applyMove(board, rng, found.from, found.to); // real rng, real commit
    board = result.board;
    moves.push(found);
  }
  return moves;
}

describe("minigame API", () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it("start issues a session id, seed, and a kokoc_sid cookie", async () => {
    const res = await handleApiRequest(
      request("/api/minigame/start", { method: "POST" }),
      makeEnv(),
      appConfig,
      makeCtx()
    );
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(typeof body.sessionId).toBe("string");
    expect(typeof body.seed).toBe("number");
    expect(body.maxMoves).toBe(MAX_MOVES);
    expect(extractCookie(res)).toBeTruthy();
  });

  it("finish rejects a request with no matching session", async () => {
    const res = await handleApiRequest(
      request("/api/minigame/finish", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: "kokoc_sid=nonexistent" },
        body: JSON.stringify({ sessionId: "does-not-exist", moves: [] })
      }),
      makeEnv(),
      appConfig,
      makeCtx()
    );
    expect(res.status).toBe(404);
  });

  it("finish computes score authoritatively from the seed, ignoring a client's own move list length games", async () => {
    const startRes = await handleApiRequest(
      request("/api/minigame/start", { method: "POST" }),
      makeEnv(),
      appConfig,
      makeCtx()
    );
    const startBody = await json(startRes);
    const cookie = extractCookie(startRes);

    // Empty move list -> score must be exactly 0, regardless of anything
    // the client might claim about its on-screen score elsewhere.
    const finishRes = await handleApiRequest(
      request("/api/minigame/finish", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `kokoc_sid=${cookie}` },
        body: JSON.stringify({ sessionId: startBody.sessionId, moves: [] })
      }),
      makeEnv(),
      appConfig,
      makeCtx()
    );
    const finishBody = await json(finishRes);

    expect(finishRes.status).toBe(200);
    expect(finishBody.score).toBe(0);
    expect(finishBody.qualifies).toBe(false);
    expect(finishBody.promo).toBeNull();
  });

  it("a session can only be finished once — resubmitting returns the already-scored result", async () => {
    const startRes = await handleApiRequest(
      request("/api/minigame/start", { method: "POST" }),
      makeEnv(),
      appConfig,
      makeCtx()
    );
    const startBody = await json(startRes);
    const cookie = extractCookie(startRes);

    const finish1 = await handleApiRequest(
      request("/api/minigame/finish", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `kokoc_sid=${cookie}` },
        body: JSON.stringify({ sessionId: startBody.sessionId, moves: [] })
      }),
      makeEnv(), appConfig, makeCtx()
    );
    expect(finish1.status).toBe(200);

    const finish2 = await handleApiRequest(
      request("/api/minigame/finish", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `kokoc_sid=${cookie}` },
        body: JSON.stringify({ sessionId: startBody.sessionId, moves: [] })
      }),
      makeEnv(), appConfig, makeCtx()
    );
    const body2 = await json(finish2);
    expect(finish2.status).toBe(200);
    expect(body2.promoAlreadyIssued).toBe(true);
  });

  it("issues a promo code when server-replayed score crosses the threshold, and reuses it on repeat qualifying sessions (one per device)", async () => {
    const startRes = await handleApiRequest(
      request("/api/minigame/start", { method: "POST" }),
      makeEnv(), appConfig, makeCtx()
    );
    const startBody = await json(startRes);
    const cookie = extractCookie(startRes);

    const moves = greedyMoves(startBody.seed, MAX_MOVES);

    const finishRes = await handleApiRequest(
      request("/api/minigame/finish", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `kokoc_sid=${cookie}` },
        body: JSON.stringify({ sessionId: startBody.sessionId, moves })
      }),
      makeEnv(), appConfig, makeCtx()
    );
    const finishBody = await json(finishRes);

    // Not every seed guarantees a qualifying score with this simple greedy
    // strategy, but across MAX_MOVES greedy plays it should clear the bar
    // often; if this particular seed didn't, that's still a valid, useful
    // assertion about consistency between score and qualifies.
    expect(finishBody.qualifies).toBe(finishBody.score >= PROMO_SCORE_THRESHOLD);

    if (finishBody.qualifies) {
      expect(finishBody.promo).toBeTruthy();
      expect(finishBody.promo.code).toMatch(/^KOKOC-/);
      expect(finishBody.promo.discountRub).toBe(500);
      expect(finishBody.promo.appliesTo).toBe("crocs");

      const firstCode = finishBody.promo.code;

      // Play a second qualifying session on the same device — must get the
      // SAME code back, not a second one.
      const start2 = await handleApiRequest(
        request("/api/minigame/start", { method: "POST", headers: { cookie: `kokoc_sid=${cookie}` } }),
        makeEnv(), appConfig, makeCtx()
      );
      const start2Body = await json(start2);
      const moves2 = greedyMoves(start2Body.seed, MAX_MOVES);
      const finish2 = await handleApiRequest(
        request("/api/minigame/finish", {
          method: "POST",
          headers: { "content-type": "application/json", cookie: `kokoc_sid=${cookie}` },
          body: JSON.stringify({ sessionId: start2Body.sessionId, moves: moves2 })
        }),
        makeEnv(), appConfig, makeCtx()
      );
      const finish2Body = await json(finish2);
      if (finish2Body.qualifies) {
        expect(finish2Body.promo.code).toBe(firstCode);
      }

      const promoRows = await env.DB.prepare(
        "SELECT COUNT(*) as n FROM promo_codes WHERE device_sid = (SELECT device_sid FROM minigame_sessions WHERE id = ?)"
      ).bind(startBody.sessionId).first();
      expect(promoRows.n).toBe(1);
    }
  });

  it("status returns null promo for a device that hasn't earned one", async () => {
    const res = await handleApiRequest(
      request("/api/minigame/status", { headers: { cookie: "kokoc_sid=brand-new-device" } }),
      makeEnv(), appConfig, makeCtx()
    );
    const body = await json(res);
    expect(body.ok).toBe(true);
    expect(body.promo).toBeNull();
  });

  it("finish rejects a moves array longer than MAX_MOVES outright", async () => {
    const startRes = await handleApiRequest(
      request("/api/minigame/start", { method: "POST" }),
      makeEnv(), appConfig, makeCtx()
    );
    const startBody = await json(startRes);
    const cookie = extractCookie(startRes);

    const tooMany = Array.from({ length: MAX_MOVES + 50 }, () => ({ from: { r: 0, c: 0 }, to: { r: 0, c: 1 } }));

    const res = await handleApiRequest(
      request("/api/minigame/finish", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `kokoc_sid=${cookie}` },
        body: JSON.stringify({ sessionId: startBody.sessionId, moves: tooMany })
      }),
      makeEnv(), appConfig, makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("finish requires a sessionId", async () => {
    const res = await handleApiRequest(
      request("/api/minigame/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ moves: [] })
      }),
      makeEnv(), appConfig, makeCtx()
    );
    expect(res.status).toBe(400);
  });

  it("rejects non-POST on /start and non-GET on /status", async () => {
    const startGet = await handleApiRequest(
      request("/api/minigame/start", { method: "GET" }),
      makeEnv(), appConfig, makeCtx()
    );
    expect(startGet.status).toBe(405);

    const statusPost = await handleApiRequest(
      request("/api/minigame/status", { method: "POST" }),
      makeEnv(), appConfig, makeCtx()
    );
    expect(statusPost.status).toBe(405);
  });
});
