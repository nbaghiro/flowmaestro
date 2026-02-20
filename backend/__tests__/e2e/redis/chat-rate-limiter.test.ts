/**
 * Chat Interface Rate Limiter E2E Tests
 *
 * Tests rate limiting patterns specific to chat interfaces
 * using real Redis. Covers IP-based, session-based, and combined
 * rate limiting strategies.
 */

import { getRedis, flushRedis } from "../setup";

describe("Chat Interface Rate Limiter (Real Redis)", () => {
    beforeEach(async () => {
        await flushRedis();
    });

    // ========================================================================
    // IP-BASED RATE LIMITING
    // ========================================================================

    describe("IP-based limiting", () => {
        it("should track requests per IP within time window", async () => {
            const redis = getRedis();
            const ip = "192.168.1.100";
            const windowSeconds = 60;
            const maxRequests = 100;

            const key = `chat:ratelimit:ip:${ip}`;

            // Use pipeline for atomic batch increment
            const pipeline = redis.pipeline();
            for (let i = 0; i < 50; i++) {
                pipeline.incr(key);
            }
            await pipeline.exec();

            // Set expiry if first request
            const count = await redis.get(key);
            const ttl = await redis.ttl(key);
            if (ttl === -1) {
                await redis.expire(key, windowSeconds);
            }

            expect(parseInt(count!)).toBe(50);
            expect(parseInt(count!)).toBeLessThan(maxRequests);
        });

        it("should block when IP exceeds 100 req/min", async () => {
            const redis = getRedis();
            const ip = "192.168.1.101";
            const maxRequests = 100;

            const key = `chat:ratelimit:ip:${ip}`;

            // Fill up to limit using SET for reliability
            await redis.set(key, String(maxRequests));
            await redis.expire(key, 60);

            // Next request should exceed limit
            const countResult = await redis.incr(key);
            const count = Number(countResult);
            const isRateLimited = count > maxRequests;

            expect(isRateLimited).toBe(true);
            expect(count).toBe(101);
        });

        it("should reset IP counter after window expires", async () => {
            const redis = getRedis();
            const ip = "192.168.1.102";
            const key = `chat:ratelimit:ip:${ip}`;

            // Set counter with 1 second TTL
            await redis.set(key, "95", "EX", 1);

            // Verify at limit
            const before = await redis.get(key);
            expect(parseInt(before!)).toBe(95);

            // Wait for expiry
            await new Promise((resolve) => setTimeout(resolve, 1100));

            // Counter should be reset
            const after = await redis.get(key);
            expect(after).toBeNull();
        });
    });

    // ========================================================================
    // SESSION-BASED RATE LIMITING
    // ========================================================================

    describe("session-based limiting", () => {
        it("should track requests per session", async () => {
            const redis = getRedis();
            const sessionId = "sess_chat_123";
            const maxRequests = 10;
            const windowSeconds = 60;

            const key = `chat:ratelimit:session:${sessionId}`;

            // Ensure clean state
            await redis.del(key);

            // Simulate 5 requests using atomic counter
            let lastCount = 0;
            for (let i = 0; i < 5; i++) {
                lastCount = await redis.incr(key);
            }
            await redis.expire(key, windowSeconds);

            expect(lastCount).toBe(5);
            expect(lastCount).toBeLessThan(maxRequests);
        });

        it("should block when session exceeds 10 req/min", async () => {
            const redis = getRedis();
            const sessionId = "sess_chat_limit";
            const maxRequests = 10;

            const key = `chat:ratelimit:session:${sessionId}`;

            // Fill up to limit
            for (let i = 0; i < maxRequests; i++) {
                await redis.incr(key);
            }
            await redis.expire(key, 60);

            // Next request should exceed limit
            const count = await redis.incr(key);
            const isRateLimited = count > maxRequests;

            expect(isRateLimited).toBe(true);
        });

        it("should handle multiple sessions independently", async () => {
            const redis = getRedis();
            const session1 = "sess_a";
            const session2 = "sess_b";

            const key1 = `chat:ratelimit:session:${session1}`;
            const key2 = `chat:ratelimit:session:${session2}`;

            // Ensure clean state
            await redis.del(key1, key2);

            // Session 1: 8 requests - use SET for reliability
            await redis.set(key1, "8");

            // Session 2: 3 requests
            await redis.set(key2, "3");

            const count1 = await redis.get(key1);
            const count2 = await redis.get(key2);

            expect(parseInt(count1!)).toBe(8);
            expect(parseInt(count2!)).toBe(3);
        });
    });

    // ========================================================================
    // COMBINED RATE LIMITING
    // ========================================================================

    describe("combined limits", () => {
        it("should check both IP and session limits", async () => {
            const redis = getRedis();
            const ip = "192.168.1.200";
            const sessionId = "sess_combined";

            const ipKey = `chat:ratelimit:ip:${ip}`;
            const sessionKey = `chat:ratelimit:session:${sessionId}`;

            const ipLimit = 100;
            const sessionLimit = 10;

            // Simulate request - check both limits
            const ipCount = await redis.incr(ipKey);
            const sessionCount = await redis.incr(sessionKey);

            if (ipCount === 1) await redis.expire(ipKey, 60);
            if (sessionCount === 1) await redis.expire(sessionKey, 60);

            const isIpLimited = ipCount > ipLimit;
            const isSessionLimited = sessionCount > sessionLimit;
            const isRateLimited = isIpLimited || isSessionLimited;

            expect(isRateLimited).toBe(false);
        });

        it("should rate limit when either limit is exceeded", async () => {
            const redis = getRedis();
            const ip = "192.168.1.201";
            const sessionId = "sess_either";

            const ipKey = `chat:ratelimit:ip:${ip}`;
            const sessionKey = `chat:ratelimit:session:${sessionId}`;

            // Session at limit (10), IP well under (5)
            await redis.set(sessionKey, "10", "EX", 60);
            await redis.set(ipKey, "5", "EX", 60);

            // Next request
            const ipCount = parseInt((await redis.incr(ipKey)).toString());
            const sessionCount = parseInt((await redis.incr(sessionKey)).toString());

            const isIpLimited = ipCount > 100;
            const isSessionLimited = sessionCount > 10;
            const isRateLimited = isIpLimited || isSessionLimited;

            expect(isIpLimited).toBe(false);
            expect(isSessionLimited).toBe(true);
            expect(isRateLimited).toBe(true);
        });

        it("should use pipeline for atomic multi-limit check", async () => {
            const redis = getRedis();
            const ip = "192.168.1.202";
            const sessionId = "sess_pipeline";

            const ipKey = `chat:ratelimit:ip:${ip}`;
            const sessionKey = `chat:ratelimit:session:${sessionId}`;

            // Atomic increment of both counters
            const pipeline = redis.pipeline();
            pipeline.incr(ipKey);
            pipeline.incr(sessionKey);
            pipeline.expire(ipKey, 60);
            pipeline.expire(sessionKey, 60);

            const results = await pipeline.exec();

            // Results: [[null, 1], [null, 1], [null, 1], [null, 1]]
            // Each result is [error, value]
            expect(results).not.toBeNull();
            expect(results![0][1]).toBe(1); // IP count
            expect(results![1][1]).toBe(1); // Session count
        });
    });

    // ========================================================================
    // RESET CALCULATIONS
    // ========================================================================

    describe("reset calculations", () => {
        it("should calculate accurate retry-after seconds", async () => {
            const redis = getRedis();
            const ip = "192.168.1.203";
            const key = `chat:ratelimit:ip:${ip}`;

            // Set counter at limit with 45 seconds remaining
            await redis.set(key, "100", "EX", 45);

            const ttl = await redis.ttl(key);

            // retry-after should be approximately 45 seconds
            expect(ttl).toBeGreaterThan(40);
            expect(ttl).toBeLessThanOrEqual(45);
        });

        it("should provide remaining requests info", async () => {
            const redis = getRedis();
            const ip = "192.168.1.204";
            const key = `chat:ratelimit:ip:${ip}`;
            const maxRequests = 100;

            // Set current count
            await redis.set(key, "75", "EX", 60);

            const currentCount = parseInt((await redis.get(key))!);
            const remaining = maxRequests - currentCount;

            expect(remaining).toBe(25);
        });

        it("should handle negative remaining gracefully", async () => {
            const redis = getRedis();
            const ip = "192.168.1.205";
            const key = `chat:ratelimit:ip:${ip}`;
            const maxRequests = 100;

            // Over limit
            await redis.set(key, "110", "EX", 60);

            const currentCount = parseInt((await redis.get(key))!);
            const remaining = Math.max(0, maxRequests - currentCount);

            expect(remaining).toBe(0);
        });
    });

    // ========================================================================
    // SLIDING WINDOW EDGE CASES
    // ========================================================================

    describe("sliding window edge cases", () => {
        it("should use sorted set for precise sliding window", async () => {
            const redis = getRedis();
            const ip = "192.168.1.206";
            const key = `chat:sliding:${ip}`;
            const windowMs = 60000; // 1 minute
            const maxRequests = 10;

            const now = Date.now();

            // Add requests spread over time window
            for (let i = 0; i < 8; i++) {
                await redis.zadd(key, now - i * 1000, `req:${i}`);
            }

            // Count requests in current window
            const windowStart = now - windowMs;
            const count = await redis.zcount(key, windowStart, now);

            expect(count).toBe(8);
            expect(count).toBeLessThan(maxRequests);
        });

        it("should remove expired entries from sliding window", async () => {
            const redis = getRedis();
            const ip = "192.168.1.207";
            const key = `chat:sliding:${ip}`;
            const windowMs = 1000; // 1 second for testing

            const now = Date.now();

            // Add old entries (outside window)
            await redis.zadd(key, now - 2000, "req:old1");
            await redis.zadd(key, now - 3000, "req:old2");
            // Add current entries
            await redis.zadd(key, now - 100, "req:current1");
            await redis.zadd(key, now - 50, "req:current2");

            // Clean up old entries
            const windowStart = now - windowMs;
            await redis.zremrangebyscore(key, "-inf", windowStart);

            // Only current entries should remain
            const count = await redis.zcard(key);
            expect(count).toBe(2);
        });

        it("should handle window boundary correctly", async () => {
            const redis = getRedis();
            const ip = "192.168.1.208";
            const key = `chat:sliding:${ip}`;
            const windowMs = 60000;

            const now = Date.now();

            // Add request at exact window boundary
            await redis.zadd(key, now - windowMs, "req:boundary");
            // Add request just inside window
            await redis.zadd(key, now - windowMs + 1, "req:inside");
            // Add current request
            await redis.zadd(key, now, "req:current");

            const windowStart = now - windowMs;

            // Boundary request should be excluded (using exclusive range)
            const count = await redis.zcount(key, `(${windowStart}`, now);
            expect(count).toBe(2); // inside + current
        });
    });

    // ========================================================================
    // RATE LIMIT METADATA
    // ========================================================================

    describe("rate limit metadata", () => {
        it("should return complete rate limit info", async () => {
            const redis = getRedis();
            const ip = "192.168.1.209";
            const key = `chat:ratelimit:ip:${ip}`;
            const maxRequests = 100;

            // Set some requests
            await redis.set(key, "42", "EX", 45);

            // Get rate limit info
            const pipeline = redis.pipeline();
            pipeline.get(key);
            pipeline.ttl(key);
            const results = await pipeline.exec();

            const currentCount = parseInt(results![0][1] as string);
            const resetIn = results![1][1] as number;
            const remaining = Math.max(0, maxRequests - currentCount);

            const rateLimitInfo = {
                limit: maxRequests,
                remaining,
                current: currentCount,
                resetIn,
                isLimited: currentCount >= maxRequests
            };

            expect(rateLimitInfo.limit).toBe(100);
            expect(rateLimitInfo.remaining).toBe(58);
            expect(rateLimitInfo.current).toBe(42);
            expect(rateLimitInfo.resetIn).toBeGreaterThan(40);
            expect(rateLimitInfo.isLimited).toBe(false);
        });
    });

    // ========================================================================
    // BYPASS AND ALLOWLIST
    // ========================================================================

    describe("bypass and allowlist", () => {
        it("should check allowlist before rate limiting", async () => {
            const redis = getRedis();
            const allowedIp = "10.0.0.1";
            const regularIp = "192.168.1.210";

            // Setup allowlist
            await redis.sadd("chat:ratelimit:allowlist", allowedIp);

            // Check if IP is in allowlist
            const isAllowed = await redis.sismember("chat:ratelimit:allowlist", allowedIp);
            const isRegularAllowed = await redis.sismember("chat:ratelimit:allowlist", regularIp);

            expect(isAllowed).toBe(1); // In allowlist, bypass rate limit
            expect(isRegularAllowed).toBe(0); // Not in allowlist, apply rate limit
        });

        it("should support temporary bypass tokens", async () => {
            const redis = getRedis();
            const bypassToken = "bypass_token_abc123";

            // Set bypass token with expiry
            await redis.set(`chat:bypass:${bypassToken}`, "1", "EX", 3600);

            // Check if bypass token is valid
            const isValid = await redis.get(`chat:bypass:${bypassToken}`);
            expect(isValid).toBe("1");

            // Invalid token
            const isInvalid = await redis.get("chat:bypass:invalid_token");
            expect(isInvalid).toBeNull();
        });
    });
});
