import { describe, expect, it } from "vitest";
import {
  GRID_SIZE,
  SYMBOL_COUNT,
  MAX_MOVES,
  BOMB_OFFSET,
  createRng,
  seedFromString,
  generateBoard,
  applyMove,
  replayGame,
  isBomb,
  symbolOf
} from "../src/lib/minigame-engine.js";

describe("createRng() / seedFromString()", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it("derives a stable numeric seed from a string", () => {
    expect(seedFromString("abc123")).toBe(seedFromString("abc123"));
    expect(seedFromString("abc123")).not.toBe(seedFromString("abc124"));
  });
});

describe("generateBoard()", () => {
  it("produces an 8x8 grid of valid symbol indices", () => {
    const board = generateBoard(7);
    expect(board.length).toBe(GRID_SIZE);
    for (const row of board) {
      expect(row.length).toBe(GRID_SIZE);
      for (const sym of row) {
        expect(sym).toBeGreaterThanOrEqual(0);
        expect(sym).toBeLessThan(SYMBOL_COUNT);
      }
    }
  });

  it("never starts with a pre-existing 3-in-a-row match", () => {
    for (const seed of [1, 2, 3, 999, 123456]) {
      const board = generateBoard(seed);
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE - 2; c++) {
          const isMatch = board[r][c] === board[r][c + 1] && board[r][c] === board[r][c + 2];
          expect(isMatch).toBe(false);
        }
      }
      for (let c = 0; c < GRID_SIZE; c++) {
        for (let r = 0; r < GRID_SIZE - 2; r++) {
          const isMatch = board[r][c] === board[r + 1][c] && board[r][c] === board[r + 2][c];
          expect(isMatch).toBe(false);
        }
      }
    }
  });

  it("is identical for the same seed across calls", () => {
    expect(generateBoard(555)).toEqual(generateBoard(555));
  });
});

describe("applyMove()", () => {
  it("rejects non-adjacent swaps", () => {
    const board = generateBoard(10);
    const rng = createRng(10);
    const result = applyMove(board, rng, { r: 0, c: 0 }, { r: 2, c: 2 });
    expect(result.valid).toBe(false);
    expect(result.gained).toBe(0);
    expect(result.board).toBe(board); // unchanged reference
  });

  it("rejects swaps that don't create a match", () => {
    // Find a seed/board where we can identify a genuinely no-op swap.
    const board = generateBoard(10);
    const rng = createRng(10);
    // Try every adjacent pair until we find one that's a legit no-match swap,
    // to keep this test robust to engine tweaks rather than hardcoding coords.
    let foundNoMatch = false;
    outer: for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) {
        const testBoard = board.map(row => row.slice());
        const tmp = testBoard[r][c];
        testBoard[r][c] = testBoard[r][c + 1];
        testBoard[r][c + 1] = tmp;
        // quick manual match check reusing engine indirectly via applyMove
        const res = applyMove(board, createRng(10), { r, c }, { r, c: c + 1 });
        if (!res.valid) {
          foundNoMatch = true;
          break outer;
        }
      }
    }
    expect(foundNoMatch).toBe(true);
  });

  it("valid swap clears matches and awards positive score", () => {
    // Construct a board by hand where a swap is guaranteed to match, bypassing
    // generateBoard's no-pre-match guarantee.
    const board = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      board.push(new Array(GRID_SIZE).fill(0).map((_, c) => (r + c) % SYMBOL_COUNT));
    }
    // Force a horizontal match at row 0: make [0,0..2] almost aligned, swap to complete it.
    board[0][0] = 1; board[0][1] = 1; board[0][2] = 2; // swap (0,2) and (1,2) if (1,2) is 1
    board[1][2] = 1;
    const rng = createRng(999);
    const result = applyMove(board, rng, { r: 0, c: 2 }, { r: 1, c: 2 });
    expect(result.valid).toBe(true);
    expect(result.gained).toBeGreaterThan(0);
  });
});

describe("bombs", () => {
  it("a 4-in-a-row match creates a bomb of that run's color", () => {
    const GRID = GRID_SIZE;
    const board = [];
    for (let r = 0; r < GRID; r++) board.push(new Array(GRID).fill(0).map((_, c) => (r * 3 + c) % SYMBOL_COUNT));
    board[0][0] = 1; board[0][1] = 1; board[0][2] = 1; board[0][3] = 2;
    board[1][3] = 1; // swapping (0,3)<->(1,3) completes a 4-run of color 1 at row 0

    const rng = createRng(555);
    const result = applyMove(board, rng, { r: 0, c: 3 }, { r: 1, c: 3 });

    expect(result.valid).toBe(true);
    expect(result.bombsCreated).toBe(1);

    let bombCount = 0;
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (isBomb(result.board[r][c])) {
        bombCount++;
        expect(symbolOf(result.board[r][c])).toBe(1);
      }
    }
    expect(bombCount).toBe(1);
  });

  it("matching a bomb into a run of its own color detonates it and clears the surrounding blast radius", () => {
    const GRID = GRID_SIZE;
    const board = [];
    for (let r = 0; r < GRID; r++) board.push(new Array(GRID).fill(0).map((_, c) => (r * 5 + c * 3) % SYMBOL_COUNT));

    board[3][3] = BOMB_OFFSET + 2;
    board[3][2] = 2;
    board[3][4] = 9;
    board[4][4] = 2; // swap (3,4)<->(4,4): row 3 becomes [..., 2, bomb(2), 2, ...] — a match including the bomb

    const rng = createRng(999);
    const result = applyMove(board, rng, { r: 3, c: 4 }, { r: 4, c: 4 });

    expect(result.valid).toBe(true);
    expect(result.bombsDetonated).toBe(1);
    expect(result.gained).toBeGreaterThan(0);
    // The bomb's own cell and its blast radius should no longer hold -1
    // (everything gets refilled) and should no longer be the old bomb value.
    expect(result.board[3][3]).not.toBe(BOMB_OFFSET + 2);
  });

  it("swapping two adjacent bombs detonates both, even with no incidental color match", () => {
    const GRID = GRID_SIZE;
    const board = [];
    for (let r = 0; r < GRID; r++) {
      const row = [];
      for (let c = 0; c < GRID; c++) row.push((r + c * 3) % SYMBOL_COUNT); // decorrelated, no accidental runs
      board.push(row);
    }
    board[4][4] = BOMB_OFFSET + 0;
    board[4][5] = BOMB_OFFSET + 3;

    const rng = createRng(42);
    const result = applyMove(board, rng, { r: 4, c: 4 }, { r: 4, c: 5 });

    expect(result.valid).toBe(true);
    expect(result.bombsDetonated).toBe(2);
  });

  it("bombsCreated/bombsDetonated stay deterministic across replays with the same seed and moves", () => {
    const seed = seedFromString("bomb-determinism-check");
    const moves = [
      { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
      { from: { r: 1, c: 1 }, to: { r: 2, c: 1 } },
      { from: { r: 3, c: 3 }, to: { r: 3, c: 4 } },
      { from: { r: 5, c: 5 }, to: { r: 6, c: 5 } }
    ];
    const runA = replayGame(seed, moves);
    const runB = replayGame(seed, moves);
    expect(runA.bombsCreated).toBe(runB.bombsCreated);
    expect(runA.bombsDetonated).toBe(runB.bombsDetonated);
  });

  it("a full random game never leaves a malformed cell on the board (always a valid symbol or valid bomb)", () => {
    function randomPlayableMove(board, pickerRng) {
      for (let attempt = 0; attempt < 200; attempt++) {
        const r = Math.floor(pickerRng() * GRID_SIZE);
        const c = Math.floor(pickerRng() * GRID_SIZE);
        const dir = pickerRng() < 0.5 ? { r: r + 1, c } : { r, c: c + 1 };
        if (dir.r >= GRID_SIZE || dir.c >= GRID_SIZE) continue;
        const probe = applyMove(board, createRng(0), { r, c }, dir);
        if (probe.valid) return { from: { r, c }, to: dir };
      }
      return null;
    }

    for (const g of [1, 2, 3]) {
      const seed = seedFromString("bomb-malformed-check-" + g);
      let board = generateBoard(seed);
      const rng = createRng(seed);
      const pickerRng = createRng(seed + 555);

      for (let i = 0; i < MAX_MOVES; i++) {
        const mv = randomPlayableMove(board, pickerRng);
        if (!mv) break;
        const result = applyMove(board, rng, mv.from, mv.to);
        board = result.board;
      }

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const v = board[r][c];
          expect(v).not.toBe(-1);
          const sym = symbolOf(v);
          expect(sym).toBeGreaterThanOrEqual(0);
          expect(sym).toBeLessThan(SYMBOL_COUNT);
        }
      }
    }
  });
});

describe("replayGame()", () => {
  it("is fully deterministic: same seed + same moves -> same score", () => {
    const seed = seedFromString("session-abc");
    const moves = [
      { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
      { from: { r: 2, c: 3 }, to: { r: 2, c: 4 } },
      { from: { r: 5, c: 5 }, to: { r: 6, c: 5 } }
    ];
    const runA = replayGame(seed, moves);
    const runB = replayGame(seed, moves);
    expect(runA.score).toBe(runB.score);
    expect(runA.board).toEqual(runB.board);
  });

  it("ignores malformed move entries instead of throwing", () => {
    const seed = seedFromString("session-def");
    const moves = [null, {}, { from: { r: 0, c: 0 } }, { from: { r: "x", c: 0 }, to: { r: 0, c: 1 } }];
    expect(() => replayGame(seed, moves)).not.toThrow();
    const result = replayGame(seed, moves);
    expect(result.score).toBe(0);
    expect(result.validMoves).toBe(0);
  });

  it("caps replay at MAX_MOVES regardless of how many are submitted", () => {
    const seed = seedFromString("session-ghi");
    const bogusMoves = Array.from({ length: MAX_MOVES + 500 }, (_, i) => ({
      from: { r: 0, c: 0 },
      to: { r: 0, c: 1 }
    }));
    const result = replayGame(seed, bogusMoves);
    expect(result.movesSubmitted).toBe(MAX_MOVES);
  });

  it("a client cannot inflate score by claiming huge gains client-side — server replay is the source of truth", () => {
    const seed = seedFromString("session-jkl");
    // No moves at all -> score must be exactly 0, no matter what a client claims.
    const result = replayGame(seed, []);
    expect(result.score).toBe(0);
  });
});
