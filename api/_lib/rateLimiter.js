/**
 * Sliding-window in-memory rate limiter for Vercel serverless functions.
 *
 * NOTE: Each function invocation gets its own V8 isolate on Vercel, so this
 * Map is per-instance. It provides meaningful protection against rapid bursts
 * from a single IP within the same warm instance. For true distributed limiting
 * across instances, pair with Upstash Redis or Vercel KV.
 *
 * Usage:
 *   import { checkRateLimit } from '../_lib/rateLimiter.js';
 *   const result = checkRateLimit(req, { max: 5, windowMs: 60_000 });
 *   if (!result.allowed) return res.status(429).json({ error: result.message });
 */

/** @type {Map<string, number[]>} key -> array of request timestamps */
const store = new Map();

/**
 * @param {import('http').IncomingMessage} req
 * @param {{ max: number, windowMs: number, keyPrefix?: string }} opts
 * @returns {{ allowed: boolean, remaining: number, message?: string }}
 */
export function checkRateLimit(req, opts) {
  const { max, windowMs, keyPrefix = '' } = opts;

  // Derive client IP from Vercel forwarded headers
  const ip =
    (req.headers['x-forwarded-for'] || '')
      .split(',')[0]
      .trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Retrieve and prune old timestamps
  const timestamps = (store.get(key) || []).filter(ts => ts > windowStart);

  if (timestamps.length >= max) {
    const retryAfterSec = Math.ceil((timestamps[0] - windowStart) / 1000);
    return {
      allowed: false,
      remaining: 0,
      message: `Rate limit exceeded. Try again in ${retryAfterSec} second${retryAfterSec === 1 ? '' : 's'}.`,
      retryAfter: retryAfterSec
    };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  // Prevent unbounded growth - evict entries older than 2 windows
  if (store.size > 5000) {
    const cutoff = now - windowMs * 2;
    for (const [k, ts] of store.entries()) {
      if (!ts.some(t => t > cutoff)) store.delete(k);
    }
  }

  return { allowed: true, remaining: max - timestamps.length };
}

/**
 * Convenience: build a rate-limit response and set the Retry-After header.
 * @param {import('http').ServerResponse} res
 * @param {{ message: string, retryAfter: number }} limitResult
 */
export function sendRateLimitResponse(res, limitResult) {
  res.setHeader('Retry-After', String(limitResult.retryAfter || 60));
  res.setHeader('X-RateLimit-Limit', '0');
  return res.status(429).json({
    error: 'Too Many Requests',
    message: limitResult.message || 'Rate limit exceeded. Please slow down.',
    retryAfter: limitResult.retryAfter
  });
}
