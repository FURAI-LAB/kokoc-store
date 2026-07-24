/**
 * ratelimit.js — KV-based sliding-window rate limiter
 *
 * Uses a single KV key per (bucket, identifier) pair.
 * The key stores a JSON array of timestamps (ms) of recent hits.
 * Hits outside the window are pruned on every check.
 *
 * Usage:
 *   const ok = await rateLimit(env.KV, 'subscribe', ipHash, { limit: 5, windowMs: 60_000 });
 *   if (!ok) return jsonResponse({ ok: false, error: 'Too many requests' }, { status: 429 });
 *
 * Falls back to `true` (allow) if KV is not bound — never blocks in dev.
 */

/**
 * @param {KVNamespace} kv
 * @param {string} bucket   — logical namespace, e.g. 'subscribe', 'review'
 * @param {string} id       — per-user identifier, e.g. ip hash
 * @param {{ limit: number, windowMs: number }} opts
 * @returns {Promise<boolean>}  true = allowed, false = rate-limited
 */
export async function rateLimit(kv, bucket, id, { limit, windowMs }) {
  if (!kv || !id) return true; // graceful degradation

  const key = `rl:${bucket}:${id}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  let hits = [];
  try {
    const raw = await kv.get(key);
    if (raw) hits = JSON.parse(raw);
  } catch {
    return true; // KV read error → allow
  }

  // Prune hits outside the window
  hits = hits.filter(t => t > cutoff);

  if (hits.length >= limit) return false; // rate-limited

  hits.push(now);

  // TTL = window duration in seconds, rounded up
  const ttl = Math.ceil(windowMs / 1000);
  try {
    await kv.put(key, JSON.stringify(hits), { expirationTtl: ttl });
  } catch {
    // KV write error → allow but don't block
  }

  return true;
}
