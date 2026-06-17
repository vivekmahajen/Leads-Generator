// lib/rateLimit.js
// Lightweight in-memory rate limiter (per-process). Sufficient for single-node
// deployments and dev. Swap for Redis/Upstash in a multi-instance deployment.

const buckets = new Map();

/**
 * @param {string} key     - unique bucket key (e.g. `otp:${email}`)
 * @param {number} limit   - max actions allowed in the window
 * @param {number} windowMs- window length in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}
