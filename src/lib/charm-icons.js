/**
 * charm-icons.js — artwork sources for the 6 Jibbitz charm types used in
 * the "Собери Jibbitz" mini-game (see minigame-engine.js for SYMBOL_COUNT).
 *
 * These are static PNG illustrations (served from /public/minigame/) rather
 * than inline SVG — the reference art has painterly shading/texture that
 * doesn't reduce well to flat vector shapes. The client (minigame.js)
 * renders each cell as an <img src="..."> pointing at one of these paths;
 * CSS animations (bombPulse/charmPop/bombBurst/charmDrop) target `.cell img`
 * the same way they used to target `.cell svg`.
 *
 * Index order is meaningful: it must match the symbol index (0..5) used by
 * minigame-engine.js's board values, since the client picks
 * CHARM_ICONS[symbolOf(cellValue)] as the image src for a cell.
 *
 * Icon set: 0 scooter, 1 coconut cocktail, 2 lavender Crocs clog,
 * 3 cat paw, 4 monstera leaf, 5 conical (Vietnamese) hat.
 */
export const CHARM_ICONS = [
  "/minigame/charm-scooter.png",   // 0 — scooter
  "/minigame/charm-coconut.png",   // 1 — coconut cocktail
  "/minigame/charm-crocs.png",     // 2 — lavender Crocs clog
  "/minigame/charm-paw.png",       // 3 — cat paw
  "/minigame/charm-leaf.png",      // 4 — monstera leaf
  "/minigame/charm-hat.png",       // 5 — conical hat
];

/**
 * Bomb tiles reuse the charm's own PNG (so the player can still tell which
 * color the bomb will detonate as); the "special tile" ring/spark effect is
 * now drawn in CSS via the `.cell.is-bomb::after` dashed ring (see
 * minigame.js styles) instead of an SVG overlay, since we no longer render
 * an inline <svg> to layer markup on top of.
 */
export const BOMB_OVERLAY = "";
