/**
 * Rate Limiting E2E Tests
 *
 * Tests rate limiting functionality against a real Redis instance
 * using Testcontainers. Verifies that the sliding window counter
 * and other rate limiting patterns work correctly.
 */

import { getRedis, flushRedis } from "../setup";

describe("Rate Limiting (Real Redis)", () => {
    beforeEach(async () => {
        await flushRedis();
    });

    // ========================================================================
    // BASIC RATE LIMITING
    // ========================================================================

    describe("basic counter rate limiting", () => {
        it("should allow requests within limit", async () => {
            const redis = getRedis();
            const key = "ratelimit:test:allow";
            const maxRequests = 10;

            // Simulate 10 requests
            for (let i = 0; i < maxRequests; i++) {
                const count = await redis.incr(key);
                expect(count).toBeLessThanOrEqual(maxRequests);
            }

            const finalCount = await redis.get(key);
            expect(parseInt(finalCount || "0", 10)).toBe(maxRequests);
        });

        it("should block requests exceeding limit", async () => {
            const redis = getRedis();
            const key = "ratelimit:test:block";
            const maxRequests = 5;

            // Ensure clean state
            await redis.del(key);

            // Fill up to limit using SET for reliability
            await redis.set(key, String(maxRequests));

            // Check that next request exceeds limit
            const count = await redis.incr(key);
            const isRateLimited = count > maxRequests;

            expect(isRateLimited).toBe(true);
            expect(count).toBe(6);
        });

        it("should set expiry on first request", async () => {
            const redis = getRedis();
            const key = "ratelimit:test:expiry";
            const windowSeconds = 60;

            // First request
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, windowSeconds);
            }

            // Check TTL
            const ttl = await redis.ttl(key);
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(windowSeconds);
        });

        it("should reset after expiry window", async () => {
            const redis = getRedis();
            const key = "ratelimit:test:reset";

            // Set counter with 1 second TTL
            await redis.set(key, "5", "EX", 1);

            // Wait for expiry
            await new Promise((resolve) => setTimeout(resolve, 1100));

            // Counter should be reset
            const value = await redis.get(key);
            expect(value).toBeNull();
        });
    });

    // ========================================================================
    // SLIDING WINDOW RATE LIMITING
    // ========================================================================

    describe("sliding window rate limiting", () => {
        it("should track requests with timestamps using sorted set", async () => {
            const redis = getRedis();
            const key = "ratelimit:sliding:test";
            const now = Date.now();

            // Add 5 requests with timestamps
            for (let i = 0; i < 5; i++) {
                await redis.zadd(key, now + i, `request:${i}`);
            }

            // Count requests in window
            const count = await redis.zcard(key);
            expect(count).toBe(5);
        });

        it("should remove old requests outside window", async () => {
            const redis = getRedis();
            const key = "ratelimit:sliding:cleanup";
            const now = Date.now();
            const windowMs = 1000;

            // Add old requests (outside window)
            await redis.zadd(key, now - 2000, "old:1");
            await redis.zadd(key, now - 1500, "old:2");

            // Add current requests
            await redis.zadd(key, now, "new:1");
            await redis.zadd(key, now + 100, "new:2");

            // Remove old requests
            await redis.zremrangebyscore(key, 0, now - windowMs);

            // Only new requests should remain
            const count = await redis.zcard(key);
            expect(count).toBe(2);
        });

        it("should correctly count requests in sliding window", async () => {
            const redis = getRedis();
            const key = "ratelimit:sliding:count";
            const now = Date.now();
            const windowMs = 1000;
            const maxRequests = 5;

            // Add requests
            for (let i = 0; i < 3; i++) {
                await redis.zadd(key, now + i, `request:${i}`);
            }

            // Remove old and count
            await redis.zremrangebyscore(key, 0, now - windowMs);
            const count = await redis.zcard(key);

            // Check if under limit
            const isAllowed = count < maxRequests;
            expect(isAllowed).toBe(true);
            expect(count).toBe(3);
        });
    });

    // ========================================================================
    // TOKEN BUCKET RATE LIMITING
    // ========================================================================

    describe("token bucket rate limiting", () => {
        it("should track tokens with timestamp", async () => {
            const redis = getRedis();
            const tokensKey = "bucket:test:tokens";
            const lastRefillKey = "bucket:test:lastRefill";
            const maxTokens = 10;

            // Initialize bucket
            await redis.set(tokensKey, maxTokens.toString());
            await redis.set(lastRefillKey, Date.now().toString());

            const tokens = await redis.get(tokensKey);
            expect(parseInt(tokens || "0", 10)).toBe(maxTokens);
        });

        it("should consume tokens on request", async () => {
            const redis = getRedis();
            const tokensKey = "bucket:test:consume";
            const maxTokens = 10;

            // Initialize bucket
            await redis.set(tokensKey, maxTokens.toString());

            // Consume a token
            const remaining = await redis.decr(tokensKey);
            expect(remaining).toBe(maxTokens - 1);

            // Consume more
            await redis.decrby(tokensKey, 5);
            const finalCount = await redis.get(tokensKey);
            expect(parseInt(finalCount || "0", 10)).toBe(maxTokens - 6);
        });

        it("should reject when no tokens available", async () => {
            const redis = getRedis();
            const tokensKey = "bucket:test:reject";

            // Empty bucket
            await redis.set(tokensKey, "0");

            const tokens = parseInt((await redis.get(tokensKey)) || "0", 10);
            const isAllowed = tokens > 0;

            expect(isAllowed).toBe(false);
        });

        it("should refill tokens based on elapsed time", async () => {
            const redis = getRedis();
            const tokensKey = "bucket:test:refill";
            const lastRefillKey = "bucket:test:refillTime";
            const maxTokens = 10;
            const refillRate = 2; // tokens per second

            // Initialize with empty bucket
            await redis.set(tokensKey, "0");
            const startTime = Date.now() - 2000; // 2 seconds ago
            await redis.set(lastRefillKey, startTime.toString());

            // Calculate refill
            const lastRefill = parseInt((await redis.get(lastRefillKey)) || "0", 10);
            const elapsedMs = Date.now() - lastRefill;
            const tokensToAdd = Math.floor((elapsedMs / 1000) * refillRate);
            const currentTokens = parseInt((await redis.get(tokensKey)) || "0", 10);
            const newTokens = Math.min(currentTokens + tokensToAdd, maxTokens);

            // Update bucket
            await redis.set(tokensKey, newTokens.toString());
            await redis.set(lastRefillKey, Date.now().toString());

            const finalTokens = parseInt((await redis.get(tokensKey)) || "0", 10);
            expect(finalTokens).toBe(4); // ~2 seconds * 2 tokens/sec = 4 tokens
        });
    });

    // ========================================================================
    // CONCURRENT ACCESS
    // ========================================================================

    describe("concurrent access", () => {
        it("should handle concurrent increments atomically", async () => {
            const redis = getRedis();
            const key = "ratelimit:concurrent:test";
            const numRequests = 100;

            // Fire concurrent requests
            const promises = Array(numRequests)
                .fill(null)
                .map(() => redis.incr(key));

            await Promise.all(promises);

            // All increments should be counted
            const finalCount = await redis.get(key);
            expect(parseInt(finalCount || "0", 10)).toBe(numRequests);
        });

        it("should handle concurrent requests with limit correctly", async () => {
            const redis = getRedis();
            const key = "ratelimit:concurrent:limit";
            const maxRequests = 10;
            const numRequests = 20;

            // Simulate concurrent rate limit checks
            const results = await Promise.all(
                Array(numRequests)
                    .fill(null)
                    .map(async () => {
                        const count = await redis.incr(key);
                        return count <= maxRequests;
                    })
            );

            const allowed = results.filter((r) => r).length;
            const blocked = results.filter((r) => !r).length;

            expect(allowed).toBe(maxRequests);
            expect(blocked).toBe(numRequests - maxRequests);
        });
    });

    // ========================================================================
    // MULTI-KEY RATE LIMITING
    // ========================================================================

    describe("multi-key rate limiting", () => {
        it("should track rate limits per user", async () => {
            const redis = getRedis();

            // Different users
            const user1Key = "ratelimit:user:1";
            const user2Key = "ratelimit:user:2";

            // User 1 makes 5 requests
            for (let i = 0; i < 5; i++) {
                await redis.incr(user1Key);
            }

            // User 2 makes 3 requests
            for (let i = 0; i < 3; i++) {
                await redis.incr(user2Key);
            }

            const user1Count = parseInt((await redis.get(user1Key)) || "0", 10);
            const user2Count = parseInt((await redis.get(user2Key)) || "0", 10);

            expect(user1Count).toBe(5);
            expect(user2Count).toBe(3);
        });

        it("should track rate limits per endpoint", async () => {
            const redis = getRedis();
            const userId = "user:1";

            // Different endpoints
            const endpoint1Key = `ratelimit:${userId}:api/users`;
            const endpoint2Key = `ratelimit:${userId}:api/workflows`;

            await redis.set(endpoint1Key, "10", "EX", 60);
            await redis.set(endpoint2Key, "5", "EX", 60);

            const keys = await redis.keys(`ratelimit:${userId}:*`);
            expect(keys).toHaveLength(2);
        });
    });

    // ========================================================================
    // PIPELINE OPERATIONS
    // ========================================================================

    describe("pipeline operations", () => {
        it("should perform rate limit check atomically with pipeline", async () => {
            const redis = getRedis();
            const key = "ratelimit:pipeline:test";
            const windowSeconds = 60;

            // Use pipeline for atomic operations
            const pipeline = redis.pipeline();
            pipeline.incr(key);
            pipeline.expire(key, windowSeconds);
            const results = await pipeline.exec();

            // Results are [error, value] pairs
            expect(results).toHaveLength(2);
            expect(results?.[0]?.[1]).toBe(1); // incr result
            expect(results?.[1]?.[1]).toBe(1); // expire result (1 = success)
        });

        it("should handle sliding window with pipeline", async () => {
            const redis = getRedis();
            const key = "ratelimit:pipeline:sliding";
            const now = Date.now();
            const windowMs = 60000;
            const requestId = `request:${now}`;

            // Atomic sliding window update
            const pipeline = redis.pipeline();
            pipeline.zremrangebyscore(key, 0, now - windowMs);
            pipeline.zadd(key, now, requestId);
            pipeline.zcard(key);
            pipeline.expire(key, Math.ceil(windowMs / 1000));

            const results = await pipeline.exec();

            // Check count result
            const count = results?.[2]?.[1];
            expect(count).toBe(1);
        });
    });

    // ========================================================================
    // RATE LIMIT HEADERS
    // ========================================================================

    describe("rate limit metadata", () => {
        it("should provide remaining requests count", async () => {
            const redis = getRedis();
            const key = "ratelimit:headers:remaining";
            const maxRequests = 100;

            // Make some requests
            await redis.set(key, "45");

            const used = parseInt((await redis.get(key)) || "0", 10);
            const remaining = maxRequests - used;

            expect(remaining).toBe(55);
        });

        it("should provide reset time", async () => {
            const redis = getRedis();
            const key = "ratelimit:headers:reset";
            const windowSeconds = 60;

            await redis.set(key, "1", "EX", windowSeconds);

            const ttl = await redis.ttl(key);
            const resetTime = Math.floor(Date.now() / 1000) + ttl;

            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(windowSeconds);
            expect(resetTime).toBeGreaterThan(Math.floor(Date.now() / 1000));
        });
    });

    // ========================================================================
    // CACHING INTEGRATION
    // ========================================================================

    describe("caching", () => {
        it("should cache and retrieve values", async () => {
            const redis = getRedis();
            const key = "cache:test:value";
            const value = JSON.stringify({ data: "test", timestamp: Date.now() });

            // Set cache with TTL
            await redis.set(key, value, "EX", 300);

            // Retrieve and parse
            const cached = await redis.get(key);
            const parsed = JSON.parse(cached || "{}");

            expect(parsed.data).toBe("test");
            expect(parsed.timestamp).toBeDefined();
        });

        it("should handle cache miss", async () => {
            const redis = getRedis();
            const key = "cache:test:miss";

            const value = await redis.get(key);
            expect(value).toBeNull();
        });

        it("should invalidate cache", async () => {
            const redis = getRedis();
            const key = "cache:test:invalidate";

            // Set and verify
            await redis.set(key, "cached_value");
            expect(await redis.get(key)).toBe("cached_value");

            // Invalidate
            await redis.del(key);
            expect(await redis.get(key)).toBeNull();
        });

        it("should invalidate cache by pattern", async () => {
            const redis = getRedis();
            const prefix = "cache:user:123:";

            // Set multiple cache entries
            await redis.set(`${prefix}profile`, "profile_data");
            await redis.set(`${prefix}settings`, "settings_data");
            await redis.set(`${prefix}preferences`, "pref_data");

            // Find and delete all user cache entries
            const keys = await redis.keys(`${prefix}*`);
            expect(keys).toHaveLength(3);

            if (keys.length > 0) {
                await redis.del(...keys);
            }

            // Verify all deleted
            const remainingKeys = await redis.keys(`${prefix}*`);
            expect(remainingKeys).toHaveLength(0);
        });
    });
});
