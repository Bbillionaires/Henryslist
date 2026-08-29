import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit (in-memory fallback)", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("allows requests up to the limit, then blocks", async () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const result = await rateLimit(key, 3, 60);
      expect(result.success).toBe(true);
    }
    const blocked = await rateLimit(key, 3, 60);
    expect(blocked.success).toBe(false);
  });

  it("tracks separate keys independently", async () => {
    const a = `test:a:${Math.random()}`;
    const b = `test:b:${Math.random()}`;
    await rateLimit(a, 1, 60);
    const secondA = await rateLimit(a, 1, 60);
    const firstB = await rateLimit(b, 1, 60);
    expect(secondA.success).toBe(false);
    expect(firstB.success).toBe(true);
  });
});
