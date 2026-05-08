import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Distributed rate limiter backed by Upstash Redis.
 *
 * In production, set:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Without those env vars (e.g. local dev), this module falls back to a
 * permissive in-memory limiter so the app still runs — but in serverless
 * environments the in-memory map is per-instance and should not be relied on.
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(maxRequests: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const key = `${maxRequests}:${windowMs}`;
  let limiter = limiterCache.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(maxRequests, `${windowMs} ms`),
      analytics: false,
      prefix: "beespo:rl",
    });
    limiterCache.set(key, limiter);
  }
  return limiter;
}

const fallbackMap = new Map<string, { count: number; resetAt: number }>();

function fallbackCheck(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let entry = fallbackMap.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    fallbackMap.set(key, entry);
    return { allowed: true, remaining: maxRequests - 1, resetAt: entry.resetAt };
  }
  entry.count++;
  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  const limiter = getLimiter(maxRequests, windowMs);

  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[rate-limiter] UPSTASH_REDIS_REST_URL/TOKEN not set; falling back to per-instance limiter"
      );
    }
    return fallbackCheck(identifier, maxRequests, windowMs);
  }

  const result = await limiter.limit(identifier);
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}
