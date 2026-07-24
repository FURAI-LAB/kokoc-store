/**
 * ratelimit.js — KV-based sliding-window rate limiter
 *
 * Concurrency caveat (important, read before relying on this)
 * ----------------------------------------------------------
 * Workers KV offers no compare-and-swap, so this is a read-modify-write
 * cycle: two requests that read the same key at the same instant both see
 * the pre-write hit list and both write back, losing one hit. A burst of
 * N truly-parallel requests can therefore exceed `limit`.
 *
 * The mitigation below shrinks that window but cannot close it: hits are
 * stored per-shard under a random shard suffix, so concurrent writers
 * usually touch different keys instead of clobbering one another, and the
 * check sums across all shards.
 *
 * If you ever need a HARD guarantee (e.g. per-user spend limits, or the
 * promo-code issuance path becoming valuable enough to farm), move that
 * specific counter to a Durable Object, which serialises writes per key.
 * D1 with a UNIQUE constraint is a workable second choice. This module is
 * deliberately best-effort abuse-dampening, not a correctness primitive.
 *
 * Falls back to `true` (allow) if KV is not bound — never blocks in dev.
 */

/** Number of shards a bucket's hits are spread across. */
const SHARDS = 4;

/**
 * @param {KVNamespace} kv
 * @param {string} bucket   — logical namespace, e.g. 'subscribe', 'review'
 * @param {string} id       — per-user identifier, e.g. ip hash
 * @param {{ limit: number, windowMs: number }} opts
 * @returns {Promise<boolean>}  true = allowed, false = rate-limited
 */
export async function rateLimit(kv, bucket, id, { limit, windowMs }) {
  if (!kv || !id) return true; // graceful degradation

  const now = Date.now();
  const cutoff = now - windowMs;
  const ttl = Math.max(60, Math.ceil(windowMs / 1000));
  const baseKey = `rl:${bucket}:${id}`;

  const shardKeys = Array.from({ length: SHARDS }, (_, i) => `${baseKey}:${i}`);

  let shardData;
  try {
    shardData = await Promise.all(shardKeys.map(k => kv.get(k)));
  } catch {
    return true; // KV read error → allow
  }

  const parsed = shardData.map(raw => {
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(t => typeof t === "number" && t > cutoff) : [];
    } catch {
      return [];
    }
  });

  const total = parsed.reduce((sum, hits) => sum + hits.length, 0);
  if (total >= limit) return false; // rate-limited

  // Record this hit on a randomly chosen shard. Spreading writes means two
  // concurrent requests are likely to update different keys rather than
  // overwriting each other's update to a single key.
  const shard = Math.floor(Math.random() * SHARDS);
  const updated = [...parsed[shard], now];

  try {
    await kv.put(shardKeys[shard], JSON.stringify(updated), { expirationTtl: ttl });
  } catch {
    // KV write error → allow but don't block
  }

  return true;
}
