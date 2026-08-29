import "server-only";
import { env } from "@/lib/env";

interface Bucket {
  count: number;
  resetAt: number;
}

// In-memory fallback limiter. Correct for a single Node process (fine for
// dev and small single-instance deployments); a multi-instance production
// deployment should set UPSTASH_REDIS_REST_URL/TOKEN so limits are shared
// across instances instead.
const memoryBuckets = new Map<string, Bucket>();

setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of memoryBuckets) {
      if (bucket.resetAt < now) memoryBuckets.delete(key);
    }
  },
  5 * 60 * 1000,
).unref?.();

async function upstashLimit(key: string, limit: number, windowSeconds: number) {
  const url = env.UPSTASH_REDIS_REST_URL!;
  const token = env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, windowSeconds.toString(), "NX"],
    ]),
  });
  const [incrResult] = (await res.json()) as [{ result: number }, unknown];
  const count = incrResult.result;
  return { success: count <= limit, remaining: Math.max(0, limit - count) };
}

function memoryLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  return { success: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

/**
 * Fixed-window rate limiter. `key` should include the action name and an
 * identity (user id or IP), e.g. `login:203.0.113.4` or `post-message:${userId}`.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ success: boolean; remaining: number }> {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await upstashLimit(key, limit, windowSeconds);
    } catch (err) {
      console.error("Upstash rate limit failed, falling back to memory:", err);
    }
  }
  return memoryLimit(key, limit, windowSeconds);
}

export const RATE_LIMITS = {
  LOGIN: { limit: 10, windowSeconds: 60 },
  REGISTER: { limit: 5, windowSeconds: 60 * 60 },
  PASSWORD_RESET_REQUEST: { limit: 5, windowSeconds: 60 * 60 },
  CREATE_LISTING: { limit: 10, windowSeconds: 60 * 60 },
  SEND_MESSAGE: { limit: 30, windowSeconds: 60 },
  CREATE_REPORT: { limit: 20, windowSeconds: 60 * 60 },
  SEARCH: { limit: 120, windowSeconds: 60 },
  UPLOAD_IMAGE: { limit: 60, windowSeconds: 60 * 60 },
  CHECKOUT: { limit: 20, windowSeconds: 60 * 60 },
} as const;

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
