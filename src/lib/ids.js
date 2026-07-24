/**
 * ids.js — shared random identifier generation.
 *
 * This exact function was previously copy-pasted, byte-for-byte, into
 * routes/api/cart.js, routes/api/orders.js, routes/api/minigame.js and
 * lib/reviews.js. Four copies of a security-relevant primitive is four
 * places to fix if the alphabet or length ever needs to change.
 */

const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Cryptographically-random identifier.
 *
 * Note on modulo bias: 256 % 62 !== 0, so `b % 62` favours the first
 * 8 characters of the alphabet very slightly. At 21 characters
 * (~125 bits) the collision margin is enormous, so this is harmless for
 * cart/order/session IDs. It is called out here so nobody later reuses
 * this for something where uniform distribution actually matters.
 *
 * @param {number} [len=21]
 * @returns {string}
 */
export function makeid(len = 21) {
  let id = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  arr.forEach(b => { id += ID_ALPHABET[b % ID_ALPHABET.length]; });
  return id;
}

/** Promo-code alphabet: no 0/O/1/I so codes can be read aloud or retyped. */
const PROMO_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Human-friendly promo code, e.g. "KOKOC-7QK4MTZP".
 * @param {string} [prefix="KOKOC"]
 * @param {number} [len=8]
 */
export function makePromoCode(prefix = "KOKOC", len = 8) {
  let code = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  arr.forEach(b => { code += PROMO_ALPHABET[b % PROMO_ALPHABET.length]; });
  return `${prefix}-${code}`;
}
