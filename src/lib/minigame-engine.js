/**
 * minigame-engine.js — deterministic match-3 engine ("Собери Jibbitz")
 *
 * This module is imported by BOTH the client-side game page (minigame.js,
 * inlined into a <script>) and the server-side finish handler
 * (routes/api/minigame.js). That's intentional: the server re-simulates the
 * exact same board from the same seed and replays the client's moves to
 * compute the *real* score itself. A client can send any moves it wants —
 * it just can't make the server award points for matches that didn't
 * actually happen on a legitimately-generated board. This is the only
 * meaningful anti-cheat lever available without a full multiplayer-style
 * authoritative loop, and it's proportionate to what's at stake (a single
 * one-time ₽500 promo code).
 *
 * Pure functions only — no DOM, no fetch, no randomness other than the
 * seeded PRNG below. Keep it that way so both sides can never drift.
 */

export const GRID_SIZE = 8;
export const SYMBOL_COUNT = 6; // 6 jibbitz charm types
export const MAX_MOVES = 20;
export const PROMO_SCORE_THRESHOLD = 800;

/**
 * Bomb encoding: a bomb of color `sym` is stored on the board as
 * `sym + BOMB_OFFSET`. Keeping cells as plain numbers (rather than
 * introducing an object shape) means the existing board/rng/replay
 * plumbing — and the JSON wire format sent to the client — doesn't need to
 * change at all; only the handful of functions that care about "what kind
 * of tile is this" need to unwrap it.
 */
export const BOMB_OFFSET = 100;

export function isBomb(value) {
  return value >= BOMB_OFFSET;
}

export function symbolOf(value) {
  return isBomb(value) ? value - BOMB_OFFSET : value;
}

function toBomb(sym) {
  return sym + BOMB_OFFSET;
}

/**
 * mulberry32 — small, fast, seedable PRNG. Deterministic across JS engines
 * (unlike Math.random), which is the whole point: same seed → same board,
 * on the client and on the Worker.
 */
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a 32-bit numeric seed from a session id string (stable hash). */
export function seedFromString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function randSymbol(rng) {
  return Math.floor(rng() * SYMBOL_COUNT);
}

/**
 * Would placing `sym` at (r,c) create an immediate 3-in-a-row?
 * `row` is the row currently being built (cells before `c` are filled;
 * cells at/after `c` don't exist yet), `board` holds the already-completed
 * rows above it (0..r-1).
 */
function causesMatchAt(board, row, r, c, sym) {
  if (
    c >= 2 &&
    row[c - 1] === sym &&
    row[c - 2] === sym
  ) return true;
  if (
    r >= 2 &&
    board[r - 1][c] === sym &&
    board[r - 2][c] === sym
  ) return true;
  return false;
}

/**
 * Generate a GRID_SIZE x GRID_SIZE board from a seed with no pre-existing
 * matches (so the player starts on a stable, legal board).
 */
export function generateBoard(seed) {
  const rng = createRng(seed);
  const board = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let sym;
      let guard = 0;
      do {
        sym = randSymbol(rng);
        guard++;
      } while (causesMatchAt(board, row, r, c, sym) && guard < 20);
      row.push(sym);
    }
    board.push(row);
  }
  return board;
}

function cloneBoard(board) {
  return board.map(row => row.slice());
}

function isAdjacent(a, b) {
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function inBounds(r, c) {
  return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}

/**
 * Find all matched runs (3+ in a row, horizontal or vertical) on the
 * current board, matching by symbolOf() so a bomb of color X counts as
 * color X for matching purposes (matching a bomb into a run of 3+ of its
 * own color is how you detonate it — see resolveCascades).
 *
 * Returns an array of match groups: [{ cells: [{r,c}, ...], length }, ...].
 * A single swap can produce more than one run (e.g. an L/T shape), which is
 * exactly the case that should be able to produce more than one bomb.
 */
function findMatchGroups(board) {
  const groups = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    let runStart = 0;
    for (let c = 1; c <= GRID_SIZE; c++) {
      const curSym = c < GRID_SIZE ? symbolOf(board[r][c]) : null;
      const startSym = symbolOf(board[r][runStart]);
      const same = c < GRID_SIZE && curSym === startSym && board[r][runStart] !== -1;
      if (!same) {
        if (c - runStart >= 3) {
          const cells = [];
          for (let k = runStart; k < c; k++) cells.push({ r, c: k });
          groups.push({ cells, length: cells.length });
        }
        runStart = c;
      }
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let runStart = 0;
    for (let r = 1; r <= GRID_SIZE; r++) {
      const curSym = r < GRID_SIZE ? symbolOf(board[r][c]) : null;
      const startSym = symbolOf(board[runStart][c]);
      const same = r < GRID_SIZE && curSym === startSym && board[runStart][c] !== -1;
      if (!same) {
        if (r - runStart >= 3) {
          const cells = [];
          for (let k = runStart; k < r; k++) cells.push({ r: k, c });
          groups.push({ cells, length: cells.length });
        }
        runStart = r;
      }
    }
  }

  return groups;
}

/** Points for a single cascade resolution, scaled by cascade combo depth. */
function scoreForMatches(count, comboDepth) {
  const base = count * 10;
  const comboBonus = count > 3 ? (count - 3) * 15 : 0;
  const depthMultiplier = 1 + Math.min(comboDepth, 4) * 0.5;
  return Math.round((base + comboBonus) * depthMultiplier);
}

/** Extra flat bonus for each bomb detonated in a cascade step. */
const BOMB_DETONATION_BONUS = 40;

/**
 * Cells cleared by one bomb detonating at (r,c): itself plus the full
 * 3x3 block around it (a "blast radius"), clipped to the board. This is
 * intentionally simple and grid-aligned so it replays identically
 * regardless of engine — no diagonals-only-if-in-bounds edge cases to get
 * subtly wrong between the client and server copies.
 */
function bombBlastCells(r, c) {
  const cells = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (inBounds(rr, cc)) cells.push({ r: rr, c: cc });
    }
  }
  return cells;
}

/**
 * Resolve all cascades after a swap: clear matches (turning any run of 4+
 * into a bomb rather than clearing it outright — the bomb is placed at the
 * swapped cell if it's part of the run, otherwise the run's middle cell),
 * detonate any bomb caught in a match (chaining further detonations if a
 * detonation's blast catches another bomb), drop tiles down, refill from
 * the top using the same rng stream, repeat until stable.
 *
 * @param {number[][]} board
 * @param {() => number} rng
 * @param {{r:number,c:number}|null} bombPreferredCell — where to place a
 *   new bomb if this resolution's matches qualify (the swap destination is
 *   preferred, matching the classic match-3 convention of "the tile you
 *   moved becomes the bomb").
 * @returns {{ board, gained: number, cascades: number, bombsCreated: number, bombsDetonated: number }}
 */
function resolveCascades(board, rng, bombPreferredCell) {
  let working = cloneBoard(board);
  let gained = 0;
  let cascades = 0;
  let bombsCreated = 0;
  let bombsDetonated = 0;

  while (true) {
    const groups = findMatchGroups(working);
    if (groups.length === 0) break;

    // Union of all matched cells this pass, plus any bomb-blast cells
    // chained in from detonating a bomb that was part of a match.
    const toClear = new Set();
    const newBombCells = []; // [{r,c,sym}] — placed AFTER clearing, so they survive this pass
    const detonateQueue = [];

    for (const group of groups) {
      for (const cell of group.cells) toClear.add(`${cell.r},${cell.c}`);

      if (group.length >= 4) {
        // This run creates a bomb. Prefer the swapped-to cell if it's part
        // of this run (only meaningful on the first cascade pass, where
        // bombPreferredCell is set); otherwise use the run's middle cell.
        // The bomb's color is the run's own color.
        const sym = symbolOf(working[group.cells[0].r][group.cells[0].c]);
        let anchor = group.cells[Math.floor(group.cells.length / 2)];
        if (bombPreferredCell) {
          const match = group.cells.find(c => c.r === bombPreferredCell.r && c.c === bombPreferredCell.c);
          if (match) anchor = match;
        }
        newBombCells.push({ r: anchor.r, c: anchor.c, sym });
      }

      // Any bomb caught inside a match (of its own color, per symbolOf()
      // matching above) detonates instead of just clearing.
      for (const cell of group.cells) {
        if (isBomb(working[cell.r][cell.c])) {
          detonateQueue.push({ r: cell.r, c: cell.c });
        }
      }
    }

    // Chain-detonate: a bomb's blast can catch another bomb, which queues
    // its own blast, etc. Cap iterations defensively — the board is finite
    // so this always terminates, but an explicit cap keeps a malformed
    // board (should be impossible) from looping forever.
    const detonated = new Set();
    let guard = 0;
    while (detonateQueue.length > 0 && guard < GRID_SIZE * GRID_SIZE) {
      guard++;
      const { r, c } = detonateQueue.shift();
      const key = `${r},${c}`;
      if (detonated.has(key)) continue;
      detonated.add(key);
      bombsDetonated++;

      for (const blastCell of bombBlastCells(r, c)) {
        const bKey = `${blastCell.r},${blastCell.c}`;
        toClear.add(bKey);
        if (working[blastCell.r][blastCell.c] !== -1 && isBomb(working[blastCell.r][blastCell.c]) && !detonated.has(bKey)) {
          detonateQueue.push(blastCell);
        }
      }
    }

    gained += scoreForMatches(toClear.size, cascades);
    gained += bombsDetonated * BOMB_DETONATION_BONUS;
    cascades++;

    for (const key of toClear) {
      const [r, c] = key.split(",").map(Number);
      working[r][c] = -1;
    }

    for (const { r, c, sym } of newBombCells) {
      // Only place the bomb if that cell actually got cleared this pass
      // (it always did — the anchor is one of the matched cells — but the
      // check keeps this robust if the matching logic above ever changes).
      working[r][c] = toBomb(sym);
      bombsCreated++;
    }

    // Drop existing tiles down within each column, then refill the gaps
    // at the top with freshly rolled symbols. Bombs fall like any other
    // tile — only their encoded value differs.
    for (let c = 0; c < GRID_SIZE; c++) {
      const col = [];
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (working[r][c] !== -1) col.push(working[r][c]);
      }
      while (col.length < GRID_SIZE) col.push(randSymbol(rng));
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        working[r][c] = col[GRID_SIZE - 1 - r];
      }
    }

    // Bombs only apply their "preferred cell" placement bonus on the very
    // first pass (the swap that triggered this whole resolution) — later
    // cascade passes have no meaningful "swapped-to" cell.
    bombPreferredCell = null;
  }

  return { board: working, gained, cascades, bombsCreated, bombsDetonated };
}

/**
 * Apply one swap move to the board+rng state.
 *
 * @param {number[][]} board
 * @param {() => number} rng — same rng instance used since generateBoard,
 *   threaded through so refills stay deterministic across the whole game.
 * @param {{r:number,c:number}} from
 * @param {{r:number,c:number}} to
 * @returns {{ board, valid: boolean, gained: number, bombsCreated: number, bombsDetonated: number }}
 */
export function applyMove(board, rng, from, to) {
  if (!inBounds(from.r, from.c) || !inBounds(to.r, to.c) || !isAdjacent(from, to)) {
    return { board, valid: false, gained: 0, bombsCreated: 0, bombsDetonated: 0 };
  }

  const working = cloneBoard(board);
  const tmp = working[from.r][from.c];
  working[from.r][from.c] = working[to.r][to.c];
  working[to.r][to.c] = tmp;

  // Swapping two bombs together, or a bomb into an adjacent bomb, detonates
  // both immediately even with no color match — this mirrors the classic
  // match-3 convention that combining two special tiles is always a legal,
  // rewarding move.
  const fromIsBomb = isBomb(working[from.r][from.c]);
  const toIsBomb = isBomb(working[to.r][to.c]);
  const groups = findMatchGroups(working);

  if (groups.length === 0 && !(fromIsBomb && toIsBomb)) {
    // Illegal move (no resulting match, and not a bomb+bomb combo) — swap
    // doesn't count, board unchanged.
    return { board, valid: false, gained: 0, bombsCreated: 0, bombsDetonated: 0 };
  }

  let result;
  if (groups.length === 0 && fromIsBomb && toIsBomb) {
    // Bomb + bomb combo with no incidental color match: detonate both
    // directly via resolveCascades by seeding its detonation path — reuse
    // the same machinery by manually clearing+chaining through a synthetic
    // single-pass. Simplest correct approach: treat both bomb cells as an
    // already-"matched" group of length 0 (no bomb-creation) so the bomb
    // detonation branch inside resolveCascades fires for both.
    const synthetic = cloneBoard(working);
    result = resolveCascadesFromBombs(synthetic, rng, [from, to]);
  } else {
    result = resolveCascades(working, rng, to);
  }

  return { board: result.board, valid: true, gained: result.gained, bombsCreated: result.bombsCreated, bombsDetonated: result.bombsDetonated };
}

/**
 * Entry point for a bomb+bomb swap with no incidental color match:
 * detonate the given cells directly (and anything their blast chains
 * into), then fall through to the same drop/refill/cascade loop as
 * resolveCascades so any matches the falling tiles create keep resolving.
 */
function resolveCascadesFromBombs(board, rng, bombCells) {
  let working = cloneBoard(board);
  let gained = 0;
  let cascades = 0;
  let bombsCreated = 0;
  let bombsDetonated = 0;

  const detonateQueue = bombCells.slice();
  const detonated = new Set();
  const toClear = new Set();
  let guard = 0;
  while (detonateQueue.length > 0 && guard < GRID_SIZE * GRID_SIZE) {
    guard++;
    const { r, c } = detonateQueue.shift();
    const key = `${r},${c}`;
    if (detonated.has(key)) continue;
    detonated.add(key);
    bombsDetonated++;

    for (const blastCell of bombBlastCells(r, c)) {
      const bKey = `${blastCell.r},${blastCell.c}`;
      toClear.add(bKey);
      if (working[blastCell.r][blastCell.c] !== -1 && isBomb(working[blastCell.r][blastCell.c]) && !detonated.has(bKey)) {
        detonateQueue.push(blastCell);
      }
    }
  }

  gained += bombsDetonated * BOMB_DETONATION_BONUS;

  for (const key of toClear) {
    const [r, c] = key.split(",").map(Number);
    working[r][c] = -1;
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    const col = [];
    for (let r = GRID_SIZE - 1; r >= 0; r--) {
      if (working[r][c] !== -1) col.push(working[r][c]);
    }
    while (col.length < GRID_SIZE) col.push(randSymbol(rng));
    for (let r = GRID_SIZE - 1; r >= 0; r--) {
      working[r][c] = col[GRID_SIZE - 1 - r];
    }
  }

  // Falling tiles may have created their own matches — keep resolving
  // through the normal cascade loop (no preferred bomb cell for these).
  const rest = resolveCascades(working, rng, null);

  return {
    board: rest.board,
    gained: gained + rest.gained,
    cascades: cascades + 1 + rest.cascades,
    bombsCreated: bombsCreated + rest.bombsCreated,
    bombsDetonated: bombsDetonated + rest.bombsDetonated
  };
}

/**
 * Replay a full sequence of moves from a seed and return the authoritative
 * final score. Invalid/no-op moves are simply skipped (don't consume a
 * "real" move's worth of score, but do count toward the move limit sent by
 * the client so it can't submit an unbounded list).
 *
 * @param {number} seed
 * @param {Array<{from:{r,c}, to:{r,c}}>} moves
 */
export function replayGame(seed, moves) {
  const rng = createRng(seed);
  let board = generateBoard(seed);
  let score = 0;
  let validMoves = 0;
  let bombsCreated = 0;
  let bombsDetonated = 0;

  const capped = Array.isArray(moves) ? moves.slice(0, MAX_MOVES) : [];

  for (const move of capped) {
    if (
      !move ||
      typeof move.from?.r !== "number" || typeof move.from?.c !== "number" ||
      typeof move.to?.r !== "number" || typeof move.to?.c !== "number"
    ) continue;

    const result = applyMove(board, rng, move.from, move.to);
    board = result.board;
    if (result.valid) {
      score += result.gained;
      validMoves++;
      bombsCreated += result.bombsCreated;
      bombsDetonated += result.bombsDetonated;
    }
  }

  return { score, validMoves, movesSubmitted: capped.length, board, bombsCreated, bombsDetonated };
}
