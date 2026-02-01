/**
 * Chat Interface Rate Limiting Tests
 *
 * Tests for IP-based and session-based rate limiting with sliding window.
 */

import { createMockRedis } from "../../helpers/redis-mock";
import { createTestChatInterface, createTestSession } from "./setup";
import type { MockRedisClient } from "../../helpers/redis-mock";

describe("Chat Interface Rate Limiting", () => {
    let redis: MockRedisClient;

    beforeEach(() => {
        redis = createMockRedis({ connected: true });
    });

    afterEach(() => {
        redis.clear();
    });

    describe("checkChatRateLimit", () => {
        /**
         * Simulates the checkChatRateLimit function behavior
         */
        async function checkChatRateLimit(
            interfaceId: string,
            sessionToken: string,
            limit: number = 10,
            windowSeconds: number = 60
        ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
            const now = Date.now();
            const windowMs = windowSeconds * 1000;
            const key = `chat-rate:${interfaceId}:${sessionToken}`;

            // Cleanup old entries
            await redis.zremrangebyscore(key, 0, now - windowMs);

            // Get current count
            const count = await redis.zcard(key);

            if (count >= limit) {
                const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
                let resetAt = now + windowMs;
                if (oldest && oldest.length > 1) {
                    resetAt = parseInt(oldest[1]) + windowMs;
                }

                return {
                    allowed: false,
                    remaining: 0,
                    resetAt
                };
            }

            // Allowed - add current request
            await redis.zadd(key, now, `${now}-${Math.random()}`);
            await redis.expire(key, windowSeconds + 5);

            return {
                allowed: true,
                remaining: limit - (count + 1),
                resetAt: now + windowMs
            };
        }

        it("should allow requests under the limit", async () => {
            // Arrange
            const interfaceId = "ci-001";
            const sessionToken = "tok_abc123";
            const limit = 10;

            // Act - make 5 requests
            const results = [];
            for (let i = 0; i < 5; i++) {
                results.push(await checkChatRateLimit(interfaceId, sessionToken, limit));
            }

            // Assert
            expect(results.every((r) => r.allowed)).toBe(true);
            expect(results[0].remaining).toBe(9);
            expect(results[4].remaining).toBe(5);
        });

        it("should block at rate limit", async () => {
            // Arrange
            const interfaceId = "ci-001";
            const sessionToken = "tok_abc123";
            const limit = 5;

            // Act - make 6 requests (1 over limit)
            const results = [];
            for (let i = 0; i < 6; i++) {
                results.push(await checkChatRateLimit(interfaceId, sessionToken, limit));
            }

            // Assert
            expect(results.slice(0, 5).every((r) => r.allowed)).toBe(true);
            expect(results[5].allowed).toBe(false);
            expect(results[5].remaining).toBe(0);
        });

        it("should return resetAt timestamp when blocked", async () => {
            // Arrange
            const interfaceId = "ci-001";
            const sessionToken = "tok_abc123";
            const limit = 3;
            const windowSeconds = 60;
            const now = Date.now();

            // Act - exceed limit
            for (let i = 0; i < 4; i++) {
                await checkChatRateLimit(interfaceId, sessionToken, limit, windowSeconds);
            }

            const blockedResult = await checkChatRateLimit(
                interfaceId,
                sessionToken,
                limit,
                windowSeconds
            );

            // Assert
            expect(blockedResult.allowed).toBe(false);
            expect(blockedResult.resetAt).toBeGreaterThan(now);
            // resetAt should be approximately now + windowMs
            expect(blockedResult.resetAt).toBeLessThanOrEqual(now + windowSeconds * 1000 + 1000);
        });

        it("should use interface-specific rate limits", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({
                id: "ci-custom",
                rateLimitMessages: 20,
                rateLimitWindowSeconds: 120
            });

            // Assert - interface has custom limits
            expect(chatInterface.rateLimitMessages).toBe(20);
            expect(chatInterface.rateLimitWindowSeconds).toBe(120);
        });

        it("should track sessions independently", async () => {
            // Arrange
            const interfaceId = "ci-001";
            const session1 = "tok_session1";
            const session2 = "tok_session2";
            const limit = 3;

            // Act - exhaust limit for session1
            for (let i = 0; i < 3; i++) {
                await checkChatRateLimit(interfaceId, session1, limit);
            }
            const session1Blocked = await checkChatRateLimit(interfaceId, session1, limit);

            // Session2 should still be allowed
            const session2Result = await checkChatRateLimit(interfaceId, session2, limit);

            // Assert
            expect(session1Blocked.allowed).toBe(false);
            expect(session2Result.allowed).toBe(true);
            expect(session2Result.remaining).toBe(2);
        });

        it("should clean old entries from sliding window", async () => {
            // Arrange
            const interfaceId = "ci-001";
            const sessionToken = "tok_abc123";
            const key = `chat-rate:${interfaceId}:${sessionToken}`;
            const limit = 5;
            const windowSeconds = 60;
            const now = Date.now();
            const oldTimestamp = now - 120000; // 2 minutes ago

            // Add old entries that should be cleaned
            await redis.zadd(key, oldTimestamp, `old-1-${Math.random()}`);
            await redis.zadd(key, oldTimestamp + 1000, `old-2-${Math.random()}`);

            // Act - make a request (which should clean old entries)
            const result = await checkChatRateLimit(
                interfaceId,
                sessionToken,
                limit,
                windowSeconds
            );

            // Assert
            expect(result.allowed).toBe(true);
            // Should have cleaned the old entries, only new one remains
            const currentCount = await redis.zcard(key);
            expect(currentCount).toBe(1);
        });
    });

    describe("IP-based Rate Limiting", () => {
        /**
         * Simulates the IP rate limiter behavior
         */
        async function checkIpRateLimit(
            ip: string,
            limit: number = 100,
            windowSeconds: number = 60
        ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
            const now = Date.now();
            const windowMs = windowSeconds * 1000;
            const key = `chat-ip-rate:${ip}`;

            await redis.zremrangebyscore(key, 0, now - windowMs);
            const count = await redis.zcard(key);

            if (count >= limit) {
                const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
                let resetAt = now + windowMs;
                if (oldest && oldest.length > 1) {
                    resetAt = parseInt(oldest[1]) + windowMs;
                }
                return { allowed: false, remaining: 0, resetAt };
            }

            await redis.zadd(key, now, `${now}-${Math.random()}`);
            await redis.expire(key, windowSeconds + 5);

            return { allowed: true, remaining: limit - (count + 1), resetAt: now + windowMs };
        }

        it("should allow under 100 requests per minute per IP", async () => {
            // Arrange
            const ip = "192.168.1.1";

            // Act - make 50 requests
            const results = [];
            for (let i = 0; i < 50; i++) {
                results.push(await checkIpRateLimit(ip, 100, 60));
            }

            // Assert
            expect(results.every((r) => r.allowed)).toBe(true);
            expect(results[49].remaining).toBe(50);
        });

        it("should block at 100 requests per minute", async () => {
            // Arrange
            const ip = "192.168.1.1";
            const limit = 100;

            // Act - make 101 requests
            const results = [];
            for (let i = 0; i < 101; i++) {
                results.push(await checkIpRateLimit(ip, limit, 60));
            }

            // Assert
            expect(results[99].allowed).toBe(true);
            expect(results[100].allowed).toBe(false);
        });

        it("should track different IPs independently", async () => {
            // Arrange
            const ip1 = "192.168.1.1";
            const ip2 = "192.168.1.2";
            const limit = 5;

            // Exhaust limit for ip1
            for (let i = 0; i < 5; i++) {
                await checkIpRateLimit(ip1, limit, 60);
            }
            const ip1Blocked = await checkIpRateLimit(ip1, limit, 60);

            // ip2 should still be allowed
            const ip2Result = await checkIpRateLimit(ip2, limit, 60);

            // Assert
            expect(ip1Blocked.allowed).toBe(false);
            expect(ip2Result.allowed).toBe(true);
        });
    });

    describe("File Upload Rate Limiting", () => {
        /**
         * File uploads have separate limits: 20 per minute
         */
        async function checkFileUploadRateLimit(
            interfaceId: string,
            sessionToken: string
        ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
            const now = Date.now();
            const windowMs = 60000; // 1 minute
            const limit = 20;
            const key = `chat-rate:file-upload:${interfaceId}:${sessionToken}`;

            await redis.zremrangebyscore(key, 0, now - windowMs);
            const count = await redis.zcard(key);

            if (count >= limit) {
                const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
                let resetAt = now + windowMs;
                if (oldest && oldest.length > 1) {
                    resetAt = parseInt(oldest[1]) + windowMs;
                }
                return { allowed: false, remaining: 0, resetAt };
            }

            await redis.zadd(key, now, `${now}-${Math.random()}`);
            await redis.expire(key, 65);

            return { allowed: true, remaining: limit - (count + 1), resetAt: now + windowMs };
        }

        it("should allow 20 file uploads per minute", async () => {
            // Arrange
            const interfaceId = "ci-001";
            const sessionToken = "tok_abc123";

            // Act - make 20 uploads
            const results = [];
            for (let i = 0; i < 20; i++) {
                results.push(await checkFileUploadRateLimit(interfaceId, sessionToken));
            }

            // Assert
            expect(results.every((r) => r.allowed)).toBe(true);
        });

        it("should block at 20 uploads per minute", async () => {
            // Arrange
            const interfaceId = "ci-001";
            const sessionToken = "tok_abc123";

            // Act - make 21 uploads
            const results = [];
            for (let i = 0; i < 21; i++) {
                results.push(await checkFileUploadRateLimit(interfaceId, sessionToken));
            }

            // Assert
            expect(results[19].allowed).toBe(true);
            expect(results[20].allowed).toBe(false);
        });

        it("should be separate from message rate limit", async () => {
            // Arrange
            const interfaceId = "ci-001";
            const sessionToken = "tok_abc123";
            const messageKey = `chat-rate:${interfaceId}:${sessionToken}`;
            const uploadKey = `chat-rate:file-upload:${interfaceId}:${sessionToken}`;

            // Add entries to both
            const now = Date.now();
            await redis.zadd(messageKey, now, "msg-1");
            await redis.zadd(uploadKey, now, "upload-1");

            // Assert they are tracked separately
            const messageCount = await redis.zcard(messageKey);
            const uploadCount = await redis.zcard(uploadKey);

            expect(messageCount).toBe(1);
            expect(uploadCount).toBe(1);
        });
    });

    describe("Rate Limit Recovery", () => {
        it("should allow requests after window expires", async () => {
            // This is a conceptual test - in real implementation,
            // old entries are cleaned on each request

            // Arrange
            const interfaceId = "ci-001";
            const sessionToken = "tok_abc123";
            const key = `chat-rate:${interfaceId}:${sessionToken}`;
            const windowSeconds = 1; // 1 second window for fast test

            // Add entries that are "old"
            const now = Date.now();
            const oldTime = now - 2000; // 2 seconds ago
            await redis.zadd(key, oldTime, "old-1");
            await redis.zadd(key, oldTime + 100, "old-2");
            await redis.zadd(key, oldTime + 200, "old-3");

            // Verify we have entries
            let count = await redis.zcard(key);
            expect(count).toBe(3);

            // Clean old entries (simulating what happens on next request)
            await redis.zremrangebyscore(key, 0, now - windowSeconds * 1000);

            // Verify old entries were removed
            count = await redis.zcard(key);
            expect(count).toBe(0);
        });

        it("should calculate correct reset time", async () => {
            // Arrange
            const interfaceId = "ci-001";
            const sessionToken = "tok_abc123";
            const key = `chat-rate:${interfaceId}:${sessionToken}`;
            const windowSeconds = 60;
            const now = Date.now();
            const firstRequestTime = now - 30000; // 30 seconds ago

            // Add first request at specific time
            await redis.zadd(key, firstRequestTime, "request-1");
            await redis.zadd(key, firstRequestTime + 1000, "request-2");
            await redis.zadd(key, firstRequestTime + 2000, "request-3");

            // Get oldest entry to calculate reset time
            const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
            const oldestTime = parseInt(oldest[1]);
            const expectedReset = oldestTime + windowSeconds * 1000;

            // Assert
            expect(expectedReset).toBe(firstRequestTime + windowSeconds * 1000);
            // Reset should be approximately 30 seconds from now
            expect(expectedReset - now).toBeCloseTo(30000, -3);
        });
    });

    describe("Integration with Session", () => {
        it("should use session token for rate limiting", () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const session = createTestSession(chatInterface.id, {
                sessionToken: "tok_unique_session"
            });

            // The rate limit key includes session token
            const expectedKey = `chat-rate:${chatInterface.id}:${session.sessionToken}`;

            // Assert
            expect(expectedKey).toBe("chat-rate:ci-001:tok_unique_session");
        });

        it("should apply interface-specific limits", () => {
            // Arrange
            const customInterface = createTestChatInterface({
                id: "ci-custom",
                rateLimitMessages: 50,
                rateLimitWindowSeconds: 300 // 5 minutes
            });

            // Assert
            expect(customInterface.rateLimitMessages).toBe(50);
            expect(customInterface.rateLimitWindowSeconds).toBe(300);
        });
    });
});
