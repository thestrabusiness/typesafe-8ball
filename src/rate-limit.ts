/**
 * In-memory sliding-window rate limiter. One process, no dependencies.
 * Good enough for a single hosted instance; swap for a shared store if the
 * server ever runs more than one replica.
 */
export interface RateLimiterOptions {
  /** Requests allowed per key within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Clock, injectable so tests are deterministic. */
  now?: () => number;
}

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

export interface RateLimiter {
  /** Records a hit for `key` if allowed and says whether it was. */
  check(key: string): RateLimitDecision;
  /** Number of keys currently tracked. Exposed for tests. */
  size(): number;
}

export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions): RateLimiter {
  if (!Number.isInteger(limit) || limit < 1) throw new Error(`limit must be a positive integer, got ${limit}`);
  if (!(windowMs > 0)) throw new Error(`windowMs must be positive, got ${windowMs}`);

  const hits = new Map<string, number[]>();
  let lastSweep = now();

  /** Drops keys whose every hit has aged out, so idle clients do not pile up. */
  function sweep(at: number): void {
    if (at - lastSweep < windowMs) return;
    lastSweep = at;
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1]! <= at - windowMs) hits.delete(key);
    }
  }

  return {
    check(key) {
      const at = now();
      sweep(at);

      const cutoff = at - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return { allowed: false, retryAfterMs: recent[0]! + windowMs - at };
      }

      recent.push(at);
      hits.set(key, recent);
      return { allowed: true, remaining: limit - recent.length };
    },
    size: () => hits.size,
  };
}
