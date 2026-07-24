import { i18n, languageSwitcherStyles } from "../lib/i18n.js";
import { renderSeoHead } from "../lib/seo.js";
import { GRID_SIZE, SYMBOL_COUNT, MAX_MOVES, PROMO_SCORE_THRESHOLD, BOMB_OFFSET } from "../lib/minigame-engine.js";
import { CHARM_ICONS } from "../lib/charm-icons.js";

export function renderMinigamePage(appConfig, locale = "ru", whatsappNumber = "", nonce = null) {
  const tr = i18n(locale);

  const rule2 = tr.t("minigameRule2").replace("${maxMoves}", String(MAX_MOVES));
  const rule3 = tr.t("minigameRule3").replace("${threshold}", String(PROMO_SCORE_THRESHOLD));
  const loseSub = tr.t("minigameGameOverLoseSub").replace("${threshold}", String(PROMO_SCORE_THRESHOLD));

  return `<!DOCTYPE html>
<html lang="${tr.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    ${renderSeoHead({
      appConfig,
      title: `${tr.t("minigameTitle")} — Kokoc Store`,
      description: tr.t("minigameSeoDescription"),
      path: "/minigame",
      locale: tr.locale,
      noindex: true
    })}
    <meta name="theme-color" content="#f5c2d8" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favsmall.png" />
    <link rel="icon" type="image/jpeg" sizes="720x720" href="/favbig.jpg" />
    <link rel="apple-touch-icon" href="/favbig.jpg" />
    <style>
      :root {
        --bg: #f9efe9;
        --text: #4d302c;
        --muted: rgba(77, 48, 44, 0.72);
        --line: rgba(255, 255, 255, 0.72);
        --shadow: 0 28px 80px rgba(102, 71, 80, 0.18);
        --glass: rgba(255, 249, 245, 0.62);
        --pink: #ff5aa6;
        --pink-deep: #e13f8d;
        --mint: #2fbf9f;
      }

      * { box-sizing: border-box; }

      html { background: var(--bg); overflow-x: hidden; }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(255, 196, 220, 0.52), transparent 26%),
          radial-gradient(circle at top right, rgba(143, 219, 255, 0.34), transparent 28%),
          linear-gradient(180deg, #fffaf5 0%, #f8ede8 100%);
      }

      a { color: inherit; text-decoration: none; }
      button, input { font: inherit; }
      button { border: 0; padding: 0; color: inherit; background: none; cursor: pointer; }

      /* ── Mini header (minigame-only, no site navbar) ── */
      .mini-header {
        position: sticky; top: 0; z-index: 100;
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px;
        height: 52px; padding: 0 16px;
        background: rgba(255,255,255,0.6);
        border-bottom: 1px solid rgba(116,82,90,0.1);
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      }
      .mini-header a {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 13px; font-weight: 600;
        color: var(--text);
        padding: 8px 12px;
        border-radius: 999px;
        transition: color 200ms, background 200ms;
        white-space: nowrap;
      }
      .mini-header a:hover { color: var(--pink); background: rgba(255,90,166,0.1); }
      .mini-header a.shop-link { color: var(--pink-deep); }
      .mini-header a.shop-link:hover { color: var(--pink); }

      .page {
        position: relative;
        min-height: calc(100vh - 56px);
        width: 100%;
        display: flex;
        justify-content: center;
        padding: 32px 16px 60px;
        opacity: 0;
        transform: translateY(18px);
        animation: enter 650ms ease forwards;
      }

      .wrap {
        max-width: 560px;
        width: 100%;
        display: grid;
        gap: 18px;
      }

      .card {
        padding: 28px 24px;
        border-radius: 30px;
        background: var(--glass);
        border: 1px solid var(--line);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        box-shadow: var(--shadow);
        display: grid;
        gap: 16px;
      }

      .eyebrow {
        margin: 0;
        font-size: 0.8rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--muted);
      }

      h1 {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
        font-size: clamp(1.7rem, 6vw, 2.4rem);
        line-height: 1.05;
        letter-spacing: -0.02em;
        text-align: center;
      }

      .lead {
        margin: 0;
        font-size: 0.98rem;
        line-height: 1.6;
        color: var(--muted);
        text-align: center;
      }

      .rules {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 8px;
        font-size: 0.88rem;
        color: var(--muted);
      }
      .rules li { display: flex; gap: 8px; align-items: flex-start; }
      .rules li::before { content: "•"; color: var(--pink); font-weight: 700; }

      .cta {
        justify-self: center;
        padding: 14px 36px;
        border-radius: 999px;
        background: var(--pink);
        color: #fff;
        font-weight: 700;
        font-size: 1rem;
        box-shadow: 0 14px 30px rgba(255, 90, 166, 0.35);
        transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
      }
      .cta:hover { transform: translateY(-1px); background: var(--pink-deep); }
      .cta:active { transform: translateY(0); }
      .cta:disabled { opacity: 0.6; cursor: default; transform: none; }

      .cta--hero {
        width: 190px;
        height: 50px;
        padding: 0;
        background: linear-gradient(135deg, #ff7eb3, #ff4fa3);
        box-shadow: 0 12px 30px rgba(255, 105, 180, 0.25);
        animation: heroButtonFloat 2.4s ease-in-out infinite;
      }
      .cta--hero:hover {
        animation: none;
        transform: scale(1.08);
        background: linear-gradient(135deg, #ff7eb3, #ff4fa3);
        box-shadow: 0 18px 45px rgba(255, 105, 180, 0.35);
      }
      .cta--hero:active {
        animation: none;
        transform: scale(0.94);
      }
      .cta--hero:disabled {
        animation: none;
      }

      @keyframes heroButtonFloat {
        0% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-6px) scale(1.03); }
        100% { transform: translateY(0) scale(1); }
      }

      .hud {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .hud-stat {
        display: grid;
        gap: 2px;
        text-align: center;
      }
      .hud-label {
        font-size: 0.7rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .hud-value {
        font-size: 1.4rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      /* ── Board ── */
      #board-wrap {
        display: flex;
        justify-content: center;
      }
      #board {
        display: grid;
        grid-template-columns: repeat(${GRID_SIZE}, 1fr);
        gap: 4px;
        width: min(100%, 420px);
        aspect-ratio: 1 / 1;
        padding: 8px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.5);
        border: 1px solid rgba(116, 82, 90, 0.1);
        touch-action: none;
        user-select: none;
      }
      .cell {
        position: relative;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: transform 140ms ease, background 140ms ease;
        overflow: visible;
      }
      .cell svg, .cell img {
        width: 82%;
        height: 82%;
        display: block;
        object-fit: contain;
        filter: drop-shadow(0 1px 1px rgba(77, 48, 44, 0.18));
        pointer-events: none;
        will-change: transform, opacity;
      }
      .cell:hover { background: rgba(255, 255, 255, 0.95); }
      .cell.is-selected {
        background: rgba(255, 90, 166, 0.22);
        transform: scale(0.92);
        box-shadow: inset 0 0 0 2px var(--pink);
      }
      .cell.is-bomb svg, .cell.is-bomb img {
        animation: bombPulse 1.1s ease-in-out infinite;
      }
      .cell.is-bomb::after {
        content: "";
        position: absolute;
        inset: 3%;
        border-radius: 50%;
        border: 1.5px dashed #ff5aa6;
        opacity: 0.85;
        pointer-events: none;
        animation: bombPulse 1.1s ease-in-out infinite;
      }
      .cell.is-clearing svg, .cell.is-clearing img {
        animation: charmPop 320ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      .cell.is-detonating svg, .cell.is-detonating img {
        animation: bombBurst 380ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      .cell.is-falling svg, .cell.is-falling img {
        --drop-from: -48px;
        animation: charmDrop 380ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
      }
      .cell.is-settling svg, .cell.is-settling img {
        animation: charmSettle 220ms ease-out both;
      }
      #board.is-shaking {
        animation: boardShake 320ms ease;
      }
      #board[aria-disabled="true"] {
        pointer-events: none;
        opacity: 0.55;
      }

      .score-pop {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        font-weight: 800;
        font-size: 0.95rem;
        color: var(--pink-deep);
        text-shadow: 0 1px 0 #fff;
        pointer-events: none;
        z-index: 20;
        animation: scorePop 900ms ease forwards;
        white-space: nowrap;
      }

      #board-message {
        min-height: 20px;
        text-align: center;
        font-size: 0.85rem;
        color: var(--muted);
      }

      /* ── End states ── */
      .end-card { text-align: center; display: grid; gap: 14px; }
      .end-icon { font-size: 2.6rem; }
      .promo-box {
        display: grid;
        gap: 10px;
        padding: 20px;
        border-radius: 20px;
        background: rgba(47, 191, 159, 0.12);
        border: 1px dashed var(--mint);
      }
      .promo-code {
        font-family: "SFMono-Regular", Consolas, monospace;
        font-size: 1.4rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: var(--text);
      }
      .promo-actions {
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .btn-secondary {
        padding: 10px 20px;
        border-radius: 999px;
        background: rgba(77, 48, 44, 0.08);
        font-weight: 600;
        font-size: 0.88rem;
        transition: background 160ms ease;
      }
      .btn-secondary:hover { background: rgba(77, 48, 44, 0.14); }
      .promo-expiry { font-size: 0.78rem; color: var(--muted); }

      .error-box {
        text-align: center;
        font-size: 0.88rem;
        color: #b3372f;
        padding: 10px 14px;
        border-radius: 14px;
        background: rgba(179, 55, 47, 0.08);
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 0.86rem;
        color: var(--muted);
      }
      .back-link:hover { color: var(--text); }

      [hidden] { display: none !important; }

${languageSwitcherStyles}

      @keyframes enter {
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes boardShake {
        10%, 90% { transform: translateX(-1px); }
        20%, 80% { transform: translateX(2px); }
        30%, 50%, 70% { transform: translateX(-4px); }
        40%, 60% { transform: translateX(4px); }
      }

      @keyframes charmPop {
        0% { transform: scale(1); opacity: 1; }
        45% { transform: scale(1.18); opacity: 1; }
        100% { transform: scale(0.35); opacity: 0; }
      }

      @keyframes bombBurst {
        0% { transform: scale(1); opacity: 1; filter: brightness(1); }
        35% { transform: scale(1.5); opacity: 1; filter: brightness(1.5); }
        100% { transform: scale(1.9); opacity: 0; filter: brightness(1.8); }
      }

      @keyframes bombPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      @keyframes charmDrop {
        0% { transform: translateY(var(--drop-from, -32px)); opacity: 0.55; }
        75% { transform: translateY(3px); opacity: 1; }
        100% { transform: translateY(0); opacity: 1; }
      }

      @keyframes charmSettle {
        0% { transform: scale(0.85); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }

      @keyframes scorePop {
        0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
        20% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        100% { transform: translate(-50%, -160%) scale(1); opacity: 0; }
      }

      @media (max-width: 600px) {
        .mini-header { padding: 0 12px; }
        .mini-header a { font-size: 12px; padding: 8px 10px; }
      }

      @media (max-width: 520px) {
        .card { padding: 22px 16px; border-radius: 22px; }
      }
    </style>
  </head>
  <body>
    <header class="mini-header">
      <a href="/">← ${tr.t("minigameBack")}</a>
      <a href="/catalog" class="shop-link">${tr.t("minigameShopLink")} →</a>
    </header>
    <main class="page">
      <div class="wrap">

        <!-- Intro screen -->
        <section class="card" id="screen-intro">
          <p class="eyebrow">Kokoc Store</p>
          <h1>${tr.t("minigameTitle")}</h1>
          <p class="lead">${tr.t("minigameLead")}</p>
          <div>
            <p class="eyebrow" style="text-align:left;margin-bottom:8px;">${tr.t("minigameHowToPlay")}</p>
            <ul class="rules">
              <li>${tr.t("minigameRule1")}</li>
              <li>${rule2}</li>
              <li>${rule3}</li>
            </ul>
          </div>
          <button class="cta cta--hero" id="btn-start" type="button">${tr.t("minigamePlay")}</button>
          <div class="error-box" id="intro-error" hidden></div>
        </section>

        <!-- Game screen -->
        <section class="card" id="screen-game" hidden>
          <div class="hud">
            <div class="hud-stat">
              <span class="hud-label">${tr.t("minigameScore")}</span>
              <span class="hud-value" id="hud-score">0</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label">${tr.t("minigameMovesLeft")}</span>
              <span class="hud-value" id="hud-moves">${MAX_MOVES}</span>
            </div>
          </div>
          <div id="board-wrap">
            <div id="board" role="grid" aria-label="${tr.t("minigameTitle")}"></div>
          </div>
          <div id="board-message"></div>
        </section>

        <!-- End screen -->
        <section class="card end-card" id="screen-end" hidden>
          <div class="end-icon" id="end-icon">🎉</div>
          <h1 id="end-title">${tr.t("minigameGameOverWin")}</h1>
          <p class="lead" id="end-sub"></p>

          <div class="promo-box" id="promo-box" hidden>
            <p class="eyebrow">${tr.t("minigamePromoTitle")}</p>
            <div class="promo-code" id="promo-code">KOKOC-XXXXXXXX</div>
            <p class="lead" style="margin:0;">${tr.t("minigamePromoDesc")}</p>
            <p class="promo-expiry" id="promo-expiry"></p>
            <div class="promo-actions">
              <button class="btn-secondary" id="btn-copy-promo" type="button">${tr.t("minigamePromoCopy")}</button>
              <a class="cta" style="padding:10px 24px;font-size:0.9rem;" id="link-order" href="/crocs">${tr.t("minigameOrderNow")}</a>
            </div>
          </div>

          <button class="cta" id="btn-restart" type="button">${tr.t("minigamePlayAgain")}</button>
          <a class="back-link" href="/">← ${locale === "en" ? "Back home" : "На главную"}</a>
        </section>

      </div>
    </main>
    <script nonce="${nonce}">
      (function () {
        "use strict";

        var GRID_SIZE = ${GRID_SIZE};
        var SYMBOL_COUNT = ${SYMBOL_COUNT};
        var MAX_MOVES = ${MAX_MOVES};
        var BOMB_OFFSET = ${BOMB_OFFSET};
        var CHARM_ICONS = ${JSON.stringify(CHARM_ICONS)};
        var LOCALE = ${JSON.stringify(tr.locale)};

        var T = {
          submitting: ${JSON.stringify(tr.t("minigameSubmitting"))},
          starting: ${JSON.stringify(tr.t("minigameStarting"))},
          play: ${JSON.stringify(tr.t("minigamePlay"))},
          errorGeneric: ${JSON.stringify(tr.t("minigameErrorGeneric"))},
          errorNetwork: ${JSON.stringify(tr.t("minigameErrorNetwork"))},
          win: ${JSON.stringify(tr.t("minigameGameOverWin"))},
          lose: ${JSON.stringify(tr.t("minigameGameOverLose"))},
          loseSub: ${JSON.stringify(loseSub)},
          copy: ${JSON.stringify(tr.t("minigamePromoCopy"))},
          copied: ${JSON.stringify(tr.t("minigamePromoCopied"))},
          expiry: ${JSON.stringify(tr.t("minigamePromoExpiry"))},
          noMatch: ${JSON.stringify(locale === "en" ? "No match — try another pair." : "Нет совпадения — попробуй другую пару.")}
        };

        var screenIntro = document.getElementById("screen-intro");
        var screenGame = document.getElementById("screen-game");
        var screenEnd = document.getElementById("screen-end");
        var introError = document.getElementById("intro-error");
        var btnStart = document.getElementById("btn-start");
        var btnRestart = document.getElementById("btn-restart");
        var boardEl = document.getElementById("board");
        var boardMessage = document.getElementById("board-message");
        var hudScore = document.getElementById("hud-score");
        var hudMoves = document.getElementById("hud-moves");
        var endIcon = document.getElementById("end-icon");
        var endTitle = document.getElementById("end-title");
        var endSub = document.getElementById("end-sub");
        var promoBox = document.getElementById("promo-box");
        var promoCode = document.getElementById("promo-code");
        var promoExpiry = document.getElementById("promo-expiry");
        var btnCopyPromo = document.getElementById("btn-copy-promo");

        /* ── Deterministic engine (mirrors src/lib/minigame-engine.js) ──
           Duplicated client-side on purpose: this file ships as a single
           inline <script>, and the server independently re-simulates the
           real score from the seed + submitted moves — see
           routes/api/minigame.js. This copy only drives what the player
           sees (including bomb creation/detonation and the visual trace
           used for animation below); it is never trusted for the promo
           decision — the server redoes all of this itself from scratch. */

        function createRng(seed) {
          var a = seed >>> 0;
          return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        }

        function randSymbol(rng) { return Math.floor(rng() * SYMBOL_COUNT); }
        function isBomb(v) { return v >= BOMB_OFFSET; }
        function symbolOf(v) { return isBomb(v) ? v - BOMB_OFFSET : v; }
        function toBomb(sym) { return sym + BOMB_OFFSET; }

        function causesMatchAt(board, row, r, c, sym) {
          if (c >= 2 && row[c - 1] === sym && row[c - 2] === sym) return true;
          if (r >= 2 && board[r - 1][c] === sym && board[r - 2][c] === sym) return true;
          return false;
        }

        function generateBoard(seed) {
          var rng = createRng(seed);
          var board = [];
          for (var r = 0; r < GRID_SIZE; r++) {
            var row = [];
            for (var c = 0; c < GRID_SIZE; c++) {
              var sym, guard = 0;
              do { sym = randSymbol(rng); guard++; }
              while (causesMatchAt(board, row, r, c, sym) && guard < 20);
              row.push(sym);
            }
            board.push(row);
          }
          return board;
        }

        function cloneBoard(b) { return b.map(function (row) { return row.slice(); }); }
        function isAdjacent(a, b) {
          var dr = Math.abs(a.r - b.r), dc = Math.abs(a.c - b.c);
          return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
        }
        function inBounds(r, c) { return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE; }

        function findMatchGroups(board) {
          var groups = [];
          var r, c, runStart, same, k;
          for (r = 0; r < GRID_SIZE; r++) {
            runStart = 0;
            for (c = 1; c <= GRID_SIZE; c++) {
              var curSym = c < GRID_SIZE ? symbolOf(board[r][c]) : null;
              var startSym = symbolOf(board[r][runStart]);
              same = c < GRID_SIZE && curSym === startSym && board[r][runStart] !== -1;
              if (!same) {
                if (c - runStart >= 3) {
                  var cells = [];
                  for (k = runStart; k < c; k++) cells.push({ r: r, c: k });
                  groups.push({ cells: cells, length: cells.length });
                }
                runStart = c;
              }
            }
          }
          for (c = 0; c < GRID_SIZE; c++) {
            runStart = 0;
            for (r = 1; r <= GRID_SIZE; r++) {
              var curSym2 = r < GRID_SIZE ? symbolOf(board[r][c]) : null;
              var startSym2 = symbolOf(board[runStart][c]);
              same = r < GRID_SIZE && curSym2 === startSym2 && board[runStart][c] !== -1;
              if (!same) {
                if (r - runStart >= 3) {
                  var cells2 = [];
                  for (k = runStart; k < r; k++) cells2.push({ r: k, c: c });
                  groups.push({ cells: cells2, length: cells2.length });
                }
                runStart = r;
              }
            }
          }
          return groups;
        }

        function scoreForMatches(count, comboDepth) {
          var base = count * 10;
          var comboBonus = count > 3 ? (count - 3) * 15 : 0;
          var depthMultiplier = 1 + Math.min(comboDepth, 4) * 0.5;
          return Math.round((base + comboBonus) * depthMultiplier);
        }

        var BOMB_DETONATION_BONUS = 40;

        function bombBlastCells(r, c) {
          var cells = [];
          for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
              var rr = r + dr, cc = c + dc;
              if (inBounds(rr, cc)) cells.push({ r: rr, c: cc });
            }
          }
          return cells;
        }

        /**
         * Same cascade-resolution algorithm as the server, but ALSO builds a
         * "steps" trace: one entry per cascade pass describing which cells
         * cleared (and whether via bomb blast), which cells became new
         * bombs, and the resulting board snapshot — so the UI can animate
         * pass-by-pass instead of jumping straight to the final board.
         */
        function resolveCascades(board, rng, bombPreferredCell) {
          var working = cloneBoard(board);
          var gained = 0, cascades = 0, bombsCreated = 0, bombsDetonated = 0;
          var steps = [];

          while (true) {
            var groups = findMatchGroups(working);
            if (groups.length === 0) break;

            var toClear = {};
            var newBombCells = [];
            var detonateQueue = [];
            var i, group;

            for (i = 0; i < groups.length; i++) {
              group = groups[i];
              for (var g = 0; g < group.cells.length; g++) {
                toClear[group.cells[g].r + "," + group.cells[g].c] = true;
              }
              if (group.length >= 4) {
                var sym = symbolOf(working[group.cells[0].r][group.cells[0].c]);
                var anchor = group.cells[Math.floor(group.cells.length / 2)];
                if (bombPreferredCell) {
                  for (var m = 0; m < group.cells.length; m++) {
                    if (group.cells[m].r === bombPreferredCell.r && group.cells[m].c === bombPreferredCell.c) {
                      anchor = group.cells[m];
                      break;
                    }
                  }
                }
                newBombCells.push({ r: anchor.r, c: anchor.c, sym: sym });
              }
              for (var g2 = 0; g2 < group.cells.length; g2++) {
                var cell = group.cells[g2];
                if (isBomb(working[cell.r][cell.c])) detonateQueue.push({ r: cell.r, c: cell.c });
              }
            }

            var detonated = {};
            var blastCells = [];
            var guard = 0;
            while (detonateQueue.length > 0 && guard < GRID_SIZE * GRID_SIZE) {
              guard++;
              var d = detonateQueue.shift();
              var dKey = d.r + "," + d.c;
              if (detonated[dKey]) continue;
              detonated[dKey] = true;
              bombsDetonated++;
              var blast = bombBlastCells(d.r, d.c);
              for (var b = 0; b < blast.length; b++) {
                var bc = blast[b];
                var bKey = bc.r + "," + bc.c;
                toClear[bKey] = true;
                blastCells.push(bc);
                if (working[bc.r][bc.c] !== -1 && isBomb(working[bc.r][bc.c]) && !detonated[bKey]) {
                  detonateQueue.push(bc);
                }
              }
            }

            var clearedCells = Object.keys(toClear).map(function (k) {
              var parts = k.split(",");
              return { r: +parts[0], c: +parts[1] };
            });

            gained += scoreForMatches(clearedCells.length, cascades);
            gained += bombsDetonated * BOMB_DETONATION_BONUS;
            cascades++;

            for (i = 0; i < clearedCells.length; i++) {
              working[clearedCells[i].r][clearedCells[i].c] = -1;
            }
            for (i = 0; i < newBombCells.length; i++) {
              working[newBombCells[i].r][newBombCells[i].c] = toBomb(newBombCells[i].sym);
              bombsCreated++;
            }

            // Snapshot immediately after clear+bomb-placement (pre-drop) —
            // this is what the "clearing/detonating" animation phase needs.
            var afterClearBoard = cloneBoard(working);

            var dropInfo = []; // per-column: which target rows are freshly-filled (for the "falling" animation)
            for (var c = 0; c < GRID_SIZE; c++) {
              var col = [];
              for (var r = GRID_SIZE - 1; r >= 0; r--) if (working[r][c] !== -1) col.push(working[r][c]);
              var filledCount = GRID_SIZE - col.length;
              while (col.length < GRID_SIZE) col.push(randSymbol(rng));
              for (var r2 = GRID_SIZE - 1; r2 >= 0; r2--) working[r2][c] = col[GRID_SIZE - 1 - r2];
              dropInfo.push({ c: c, newTiles: filledCount });
            }

            steps.push({
              clearedCells: clearedCells,
              newBombCells: newBombCells,
              detonatedBombCells: Object.keys(detonated).map(function (k) {
                var parts = k.split(",");
                return { r: +parts[0], c: +parts[1] };
              }),
              gainedThisStep: scoreForMatches(clearedCells.length, cascades - 1) + bombsDetonated * BOMB_DETONATION_BONUS,
              afterClearBoard: afterClearBoard,
              afterDropBoard: cloneBoard(working),
              dropInfo: dropInfo
            });

            bombPreferredCell = null;
          }

          return { board: working, gained: gained, cascades: cascades, bombsCreated: bombsCreated, bombsDetonated: bombsDetonated, steps: steps };
        }

        function resolveCascadesFromBombs(board, rng, bombCells) {
          var working = cloneBoard(board);
          var gained = 0, bombsDetonated = 0;
          var detonateQueue = bombCells.slice();
          var detonated = {};
          var toClear = {};
          var guard = 0;
          while (detonateQueue.length > 0 && guard < GRID_SIZE * GRID_SIZE) {
            guard++;
            var d = detonateQueue.shift();
            var dKey = d.r + "," + d.c;
            if (detonated[dKey]) continue;
            detonated[dKey] = true;
            bombsDetonated++;
            var blast = bombBlastCells(d.r, d.c);
            for (var b = 0; b < blast.length; b++) {
              var bc = blast[b];
              var bKey = bc.r + "," + bc.c;
              toClear[bKey] = true;
              if (working[bc.r][bc.c] !== -1 && isBomb(working[bc.r][bc.c]) && !detonated[bKey]) {
                detonateQueue.push(bc);
              }
            }
          }
          gained += bombsDetonated * BOMB_DETONATION_BONUS;

          var clearedCells = Object.keys(toClear).map(function (k) {
            var parts = k.split(",");
            return { r: +parts[0], c: +parts[1] };
          });
          for (var i = 0; i < clearedCells.length; i++) working[clearedCells[i].r][clearedCells[i].c] = -1;

          var afterClearBoard = cloneBoard(working);
          var dropInfo = [];
          for (var c = 0; c < GRID_SIZE; c++) {
            var col = [];
            for (var r = GRID_SIZE - 1; r >= 0; r--) if (working[r][c] !== -1) col.push(working[r][c]);
            var filledCount = GRID_SIZE - col.length;
            while (col.length < GRID_SIZE) col.push(randSymbol(rng));
            for (var r2 = GRID_SIZE - 1; r2 >= 0; r2--) working[r2][c] = col[GRID_SIZE - 1 - r2];
            dropInfo.push({ c: c, newTiles: filledCount });
          }

          var firstStep = {
            clearedCells: clearedCells,
            newBombCells: [],
            detonatedBombCells: Object.keys(detonated).map(function (k) {
              var parts = k.split(",");
              return { r: +parts[0], c: +parts[1] };
            }),
            gainedThisStep: gained,
            afterClearBoard: afterClearBoard,
            afterDropBoard: cloneBoard(working),
            dropInfo: dropInfo
          };

          var rest = resolveCascades(working, rng, null);
          return {
            board: rest.board,
            gained: gained + rest.gained,
            cascades: 1 + rest.cascades,
            bombsCreated: rest.bombsCreated,
            bombsDetonated: bombsDetonated + rest.bombsDetonated,
            steps: [firstStep].concat(rest.steps)
          };
        }

        function applyMove(board, rng, from, to) {
          if (!inBounds(from.r, from.c) || !inBounds(to.r, to.c) || !isAdjacent(from, to)) {
            return { board: board, valid: false, gained: 0, bombsCreated: 0, bombsDetonated: 0, steps: [] };
          }
          var working = cloneBoard(board);
          var tmp = working[from.r][from.c];
          working[from.r][from.c] = working[to.r][to.c];
          working[to.r][to.c] = tmp;

          var fromIsBomb = isBomb(working[from.r][from.c]);
          var toIsBomb = isBomb(working[to.r][to.c]);
          var groups = findMatchGroups(working);

          if (groups.length === 0 && !(fromIsBomb && toIsBomb)) {
            return { board: board, valid: false, gained: 0, bombsCreated: 0, bombsDetonated: 0, steps: [] };
          }

          var result;
          if (groups.length === 0 && fromIsBomb && toIsBomb) {
            result = resolveCascadesFromBombs(cloneBoard(working), rng, [from, to]);
          } else {
            result = resolveCascades(working, rng, to);
          }

          return { board: result.board, valid: true, gained: result.gained, bombsCreated: result.bombsCreated, bombsDetonated: result.bombsDetonated, steps: result.steps, swappedCells: [from, to] };
        }

        /* ── Game state ── */
        var state = null; // { sessionId, seed, rng, board, score, movesLeft, moves, selected, locked }

        // Persistent per-cell DOM nodes: [r][c] -> { el, img }. Created once
        // and reused for the lifetime of a game session so mid-cascade
        // updates never touch cells that aren't actually changing — that's
        // what removes the multi-clear flicker (previously the whole board
        // was torn down and rebuilt via innerHTML on every cascade step).
        var cellEls = null;

        function charmSrc(value) {
          var sym = symbolOf(value);
          return CHARM_ICONS[sym] || "";
        }

        function getCellEl(r, c) {
          return cellEls && cellEls[r] && cellEls[r][c] ? cellEls[r][c].el : null;
        }

        function buildCellGrid() {
          boardEl.innerHTML = "";
          cellEls = [];
          for (var r = 0; r < GRID_SIZE; r++) {
            var row = [];
            for (var c = 0; c < GRID_SIZE; c++) {
              (function (r, c) {
                var cell = document.createElement("button");
                cell.type = "button";
                cell.className = "cell";
                cell.dataset.r = String(r);
                cell.dataset.c = String(c);
                cell.setAttribute("role", "gridcell");
                var img = document.createElement("img");
                img.alt = "";
                img.draggable = false;
                img.loading = "lazy";
                cell.appendChild(img);
                cell.addEventListener("click", onCellClick);
                boardEl.appendChild(cell);
                row.push({ el: cell, img: img });
              })(r, c);
            }
            cellEls.push(row);
          }
        }

        // Resets every cell's content/classes to match the given matrix
        // instantly — no animation classes, no transitions. Used for the
        // very first render of a session and whenever we need a hard reset.
        function setBoardMatrix(matrix) {
          if (!cellEls) buildCellGrid();
          for (var r = 0; r < GRID_SIZE; r++) {
            for (var c = 0; c < GRID_SIZE; c++) {
              var value = matrix[r][c];
              var entry = cellEls[r][c];
              entry.img.src = charmSrc(value);
              entry.el.classList.remove("is-clearing", "is-detonating", "is-falling", "is-settling");
              entry.el.classList.toggle("is-bomb", isBomb(value));
            }
          }
          updateSelectionStyles();
        }

        function renderBoard() {
          setBoardMatrix(state.board);
        }

        function updateSelectionStyles() {
          for (var r = 0; r < GRID_SIZE; r++) {
            for (var c = 0; c < GRID_SIZE; c++) {
              var isSel = state.selected && state.selected.r === r && state.selected.c === c;
              cellEls[r][c].el.classList.toggle("is-selected", !!isSel);
            }
          }
        }

        function setBoardLocked(locked) {
          boardEl.setAttribute("aria-disabled", locked ? "true" : "false");
        }

        function shakeBoard() {
          boardEl.classList.remove("is-shaking");
          // eslint-disable-next-line no-unused-expressions
          void boardEl.offsetWidth; // restart the CSS animation
          boardEl.classList.add("is-shaking");
        }

        function showScorePop(r, c, amount) {
          if (!amount) return;
          var cell = getCellEl(r, c);
          if (!cell) return;
          var pop = document.createElement("span");
          pop.className = "score-pop";
          pop.textContent = "+" + amount;
          cell.appendChild(pop);
          setTimeout(function () { pop.remove(); }, 950);
        }

        function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

        /**
         * Animate one applyMove() result step-by-step: clear/detonate ->
         * pop/burst animation -> drop-in new tiles -> next cascade step.
         *
         * Only the cells that actually change at each phase are touched —
         * cleared cells get an animation class, dropped-in cells get their
         * image swapped and a fall-distance-aware "falling" class, and
         * every other cell on the board is left completely alone. That's
         * what keeps multi-cell clears (and chained cascades) smooth
         * instead of flickering.
         */
        async function animateMoveResult(result) {
          if (!cellEls) buildCellGrid();

          for (var i = 0; i < result.steps.length; i++) {
            var step = result.steps[i];
            var detonatedSet = {};
            step.detonatedBombCells.forEach(function (cell) { detonatedSet[cell.r + "," + cell.c] = true; });

            // Phase 1: play the clear/detonate animation in place on exactly
            // the cells that matched — nothing else in the grid is touched.
            step.clearedCells.forEach(function (cell) {
              var el = getCellEl(cell.r, cell.c);
              if (!el) return;
              var key = cell.r + "," + cell.c;
              el.classList.add(detonatedSet[key] ? "is-detonating" : "is-clearing");
            });

            if (step.gainedThisStep > 0 && step.clearedCells.length > 0) {
              var mid = step.clearedCells[Math.floor(step.clearedCells.length / 2)];
              showScorePop(mid.r, mid.c, step.gainedThisStep);
            }

            await wait(300);

            // Phase 2: settle to the post-drop board. For each column, walk
            // afterClearBoard (has -1 gaps where matches were cleared) and
            // afterDropBoard (final, gravity-settled) together to find the
            // *real* new resting row for every surviving tile and how many
            // rows it fell — surviving tiles keep their relative order, so
            // this is a simple two-pointer match, no guessing from
            // coordinates. Only cells whose value actually changed get the
            // falling animation; everything else is left untouched.
            var newTiles = (step.dropInfo || []).reduce(function (acc, col) {
              acc[col.c] = col.newTiles;
              return acc;
            }, {});

            for (var c = 0; c < GRID_SIZE; c++) {
              // Collect surviving (non-cleared) values from afterClearBoard,
              // top to bottom, in original row order.
              var survivors = [];
              for (var sr = 0; sr < GRID_SIZE; sr++) {
                var beforeVal = step.afterClearBoard[sr][c];
                if (beforeVal !== -1) survivors.push({ fromRow: sr, value: beforeVal });
              }

              var spawnCount = newTiles[c] || 0;
              // Final column order is: spawnCount new tiles on top, then
              // survivors in their original relative order beneath them.
              for (var r = 0; r < GRID_SIZE; r++) {
                var entry = cellEls[r][c];
                var value = step.afterDropBoard[r][c];
                entry.el.classList.remove("is-clearing", "is-detonating");

                var isSpawn = r < spawnCount;
                var survivor = isSpawn ? null : survivors[r - spawnCount];
                var fellRows = isSpawn ? null : (survivor ? r - survivor.fromRow : null);
                var changed = isSpawn || (fellRows !== null && fellRows > 0);

                if (!changed) {
                  entry.el.classList.remove("is-falling");
                  continue;
                }

                entry.img.src = charmSrc(value);
                entry.el.classList.toggle("is-bomb", isBomb(value));
                var distancePx = isSpawn ? (40 + (spawnCount - r) * 34) : (fellRows * 34);
                entry.el.style.setProperty("--drop-from", (-distancePx) + "px");
                entry.el.classList.remove("is-falling");
                void entry.el.offsetWidth;
                entry.el.classList.add("is-falling");
              }
            }

            await wait(300);

            for (var r2 = 0; r2 < GRID_SIZE; r2++) {
              for (var c2 = 0; c2 < GRID_SIZE; c2++) {
                cellEls[r2][c2].el.classList.remove("is-falling");
              }
            }
          }

          state.animBoard = result.board;
        }

        function onCellClick(e) {
          if (suppressNextClick) {
            suppressNextClick = false;
            return;
          }
          if (!state || state.locked) return;
          var r = +e.currentTarget.dataset.r;
          var c = +e.currentTarget.dataset.c;

          if (!state.selected) {
            state.selected = { r: r, c: c };
            updateSelectionStyles();
            return;
          }

          if (state.selected.r === r && state.selected.c === c) {
            state.selected = null;
            updateSelectionStyles();
            return;
          }

          var from = state.selected;
          var to = { r: r, c: c };
          state.selected = null;

          if (!isAdjacent(from, to)) {
            state.selected = { r: r, c: c };
            updateSelectionStyles();
            return;
          }

          performMove(from, to);
        }

        /**
         * Swipe-to-swap for touch/pen input only (phones and tablets).
         * Mouse users keep the existing tap-tap select flow untouched —
         * this listens on the board itself and filters by e.pointerType,
         * so a mouse (even on a touch-capable laptop) never triggers it.
         *
         * A swipe starting on a cell, once it clears a small distance
         * threshold, resolves to one of the four grid directions and
         * performs that move directly — no need to lift and re-tap.
         */
        var SWIPE_THRESHOLD_PX = 18;
        var swipeState = null; // { pointerId, startX, startY, r, c, resolved }
        var suppressNextClick = false;

        function onBoardPointerDown(e) {
          if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
          if (!state || state.locked) return;
          var cellEl = e.target.closest(".cell");
          if (!cellEl) return;

          swipeState = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            r: +cellEl.dataset.r,
            c: +cellEl.dataset.c,
            resolved: false
          };
        }

        function onBoardPointerMove(e) {
          if (!swipeState || e.pointerId !== swipeState.pointerId || swipeState.resolved) return;

          var dx = e.clientX - swipeState.startX;
          var dy = e.clientY - swipeState.startY;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) return;

          swipeState.resolved = true;

          var dir;
          if (Math.abs(dx) > Math.abs(dy)) {
            dir = dx > 0 ? { r: 0, c: 1 } : { r: 0, c: -1 };
          } else {
            dir = dy > 0 ? { r: 1, c: 0 } : { r: -1, c: 0 };
          }

          var from = { r: swipeState.r, c: swipeState.c };
          var to = { r: from.r + dir.r, c: from.c + dir.c };
          swipeState = null;
          suppressNextClick = true;

          if (!state || state.locked || !inBounds(to.r, to.c)) return;

          state.selected = null;
          updateSelectionStyles();
          performMove(from, to);
        }

        function onBoardPointerUp(e) {
          if (!swipeState || e.pointerId !== swipeState.pointerId) return;
          // Swipe ended without crossing the threshold — leave the existing
          // tap-based onCellClick handler to treat it as a normal tap/select.
          swipeState = null;
        }

        boardEl.addEventListener("pointerdown", onBoardPointerDown);
        boardEl.addEventListener("pointermove", onBoardPointerMove);
        boardEl.addEventListener("pointerup", onBoardPointerUp);
        boardEl.addEventListener("pointercancel", onBoardPointerUp);

        async function performMove(from, to) {
          if (!state || state.locked || state.movesLeft <= 0) return;

          var result = applyMove(state.board, state.rng, from, to);
          if (!result.valid) {
            boardMessage.textContent = T.noMatch;
            updateSelectionStyles();
            shakeBoard();
            return;
          }

          boardMessage.textContent = "";
          state.locked = true;
          setBoardLocked(true);

          state.board = result.board;
          state.score += result.gained;
          state.movesLeft -= 1;
          state.moves.push({ from: from, to: to });

          if (!state.animBoard) state.animBoard = state.board;
          await animateMoveResult(result);

          hudScore.textContent = String(state.score);
          hudMoves.textContent = String(state.movesLeft);
          renderBoard();

          state.locked = false;
          setBoardLocked(false);

          if (state.movesLeft <= 0) {
            finishGame();
          }
        }

        function showScreen(name) {
          screenIntro.hidden = name !== "intro";
          screenGame.hidden = name !== "game";
          screenEnd.hidden = name !== "end";
        }

        async function startGame() {
          introError.hidden = true;
          btnStart.disabled = true;
          btnStart.textContent = T.starting;

          try {
            var res = await fetch("/api/minigame/start", { method: "POST" });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || T.errorGeneric);

            var initialBoard = generateBoard(data.seed);
            state = {
              sessionId: data.sessionId,
              seed: data.seed,
              rng: createRng(data.seed),
              board: initialBoard,
              animBoard: initialBoard,
              score: 0,
              movesLeft: data.maxMoves || MAX_MOVES,
              moves: [],
              selected: null,
              locked: false
            };

            hudScore.textContent = "0";
            hudMoves.textContent = String(state.movesLeft);
            boardMessage.textContent = "";
            renderBoard();
            showScreen("game");
          } catch (err) {
            introError.textContent = (err && err.message) ? err.message : T.errorNetwork;
            introError.hidden = false;
          } finally {
            btnStart.disabled = false;
            btnStart.textContent = T.play;
          }
        }

        async function finishGame() {
          if (!state) return;
          state.locked = true;
          setBoardLocked(true);
          boardMessage.textContent = T.submitting;

          try {
            var res = await fetch("/api/minigame/finish", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ sessionId: state.sessionId, moves: state.moves })
            });
            var data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || T.errorGeneric);

            renderEnd(data);
          } catch (err) {
            renderEnd({ ok: false, score: state.score, qualifies: false, error: (err && err.message) || T.errorNetwork });
          } finally {
            setBoardLocked(false);
          }
        }

        function renderEnd(data) {
          var qualifies = !!data.qualifies;
          endIcon.textContent = qualifies ? "🎉" : "🙂";
          endTitle.textContent = qualifies ? T.win : T.lose;
          endSub.textContent = qualifies ? "" : (data.error ? data.error : T.loseSub);

          if (qualifies && data.promo && data.promo.code) {
            promoBox.hidden = false;
            promoCode.textContent = data.promo.code;
            if (data.promo.expiresAt) {
              var d = new Date(data.promo.expiresAt);
              promoExpiry.textContent = T.expiry + ": " + d.toLocaleDateString(LOCALE === "en" ? "en-GB" : "ru-RU");
            } else {
              promoExpiry.textContent = "";
            }
          } else {
            promoBox.hidden = true;
          }

          showScreen("end");
        }

        btnCopyPromo.addEventListener("click", function () {
          var text = promoCode.textContent || "";
          if (!text) return;
          var done = function () {
            btnCopyPromo.textContent = T.copied;
            setTimeout(function () { btnCopyPromo.textContent = T.copy; }, 1600);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(done);
          } else {
            done();
          }
        });

        btnStart.addEventListener("click", startGame);
        btnRestart.addEventListener("click", function () {
          state = null;
          showScreen("intro");
        });
      })();
    </script>
  </body>
</html>`;
}
