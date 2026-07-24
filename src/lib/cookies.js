/**
 * cookies.js — shared cookie parsing and the kokoc_sid device cookie.
 *
 * parseCookies() was previously duplicated in routes/api/cart.js and
 * routes/api/minigame.js, and both modules also carried their own copy of
 * the kokoc_sid cookie name / TTL / Set-Cookie builder. Because both files
 * mint the SAME cookie, any drift between the two copies (a different TTL,
 * a missing Secure flag) would silently produce two different session
 * identities for one browser.
 */

/** The single device/session cookie used by both the cart and the minigame. */
export const SESSION_COOKIE_NAME = "kokoc_sid";

/** How long the device session lives, in days. */
export const SESSION_TTL_DAYS = 30;

/**
 * Parse a Cookie header into a plain object.
 * Malformed percent-encoding in any single pair is skipped rather than
 * throwing, so one bad cookie can't break the whole request.
 *
 * @param {string} header
 * @returns {Record<string,string>}
 */
export function parseCookies(header = "") {
  return Object.fromEntries(
    header.split(";").flatMap(s => {
      const idx = s.indexOf("=");
      if (idx === -1) return [];
      try {
        const k = decodeURIComponent(s.slice(0, idx).trim());
        const v = decodeURIComponent(s.slice(idx + 1).trim());
        return [[k, v]];
      } catch { return []; }
    })
  );
}

/**
 * Build the Set-Cookie header for the device session.
 *
 * SameSite=Lax (not Strict) is deliberate: the cart must survive a user
 * arriving from an external link. The CSRF guard in lib/csrf.js is what
 * covers the top-level-POST gap that Lax leaves open.
 *
 * @param {string} sid
 * @param {number} [ttlDays]
 */
export function setSessionCookie(sid, ttlDays = SESSION_TTL_DAYS) {
  const expires = new Date(Date.now() + ttlDays * 864e5).toUTCString();
  return `${SESSION_COOKIE_NAME}=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}
