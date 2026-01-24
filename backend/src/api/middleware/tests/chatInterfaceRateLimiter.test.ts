/**
 * Chat Interface Rate Limiter Tests
 *
 * Tests for in-memory rate limiting middleware (chatInterfaceRateLimiter.ts)
 */

import {
    createMockRequest,
    createMockReply,
    assertErrorResponse,
    assertNoResponse
} from "../../../../tests/helpers/middleware-test-utils";

// Mock the logger
jest.mock("../../../core/logging", () => ({
    createServiceLogger: jest.fn().mockReturnValue({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
    })
}));

import {
    createChatInterfaceRateLimiter,
    chatInterfaceRateLimiter,
    getChatInterfaceRateLimiter
} from "../chatInterfaceRateLimiter";

// Type for rate limit error response body in tests
interface RateLimitResponseBody {
    error: string;
    retryAfter: number;
}

describe("createChatInterfaceRateLimiter", () => {
    describe("Basic rate limiting", () => {
        it("should allow requests under the limit", async () => {
            const middleware = createChatInterfaceRateLimiter({
                limitPerMinute: 10,
                windowSeconds: 60
            });

            const request = createMockRequest({
                ip: "unique-ip-1",
                headers: {}
            });
            const reply = createMockReply();

            await middleware(request, reply);

            assertNoResponse(reply);
        });

        it("should allow multiple requests up to the limit", async () => {
            const middleware = createChatInterfaceRateLimiter({
                limitPerMinute: 5,
                windowSeconds: 60
            });

            const ip = `test-ip-${Date.now()}-1`;

            // Make 5 requests (should all pass)
            for (let i = 0; i < 5; i++) {
                const request = createMockRequest({ ip, headers: {} });
                const reply = createMockReply();
                await middleware(request, reply);
                assertNoResponse(reply);
            }
        });

        it("should block requests over the limit", async () => {
            const middleware = createChatInterfaceRateLimiter({
                limitPerMinute: 3,
                windowSeconds: 60
            });

            const ip = `test-ip-${Date.now()}-2`;

            // Make 3 requests (should pass)
            for (let i = 0; i < 3; i++) {
                const request = createMockRequest({ ip, headers: {} });
                const reply = createMockReply();
                await middleware(request, reply);
                assertNoResponse(reply);
            }

            // 4th request should be blocked
            const request = createMockRequest({ ip, headers: {} });
            const reply = createMockReply();
            await middleware(request, reply);

            assertErrorResponse(reply, 429);
            const body = reply._tracking.sentBody as RateLimitResponseBody;
            expect(body.error).toContain("Too many messages");
            expect(body.retryAfter).toBeDefined();
            expect(typeof body.retryAfter).toBe("number");
        });
    });

    describe("Session token based limiting", () => {
        it("should use session token from header for rate limiting", async () => {
            const middleware = createChatInterfaceRateLimiter({
                limitPerMinute: 2,
                windowSeconds: 60
            });

            const sessionToken = `session-${Date.now()}-1`;

            // First 2 requests should pass
            for (let i = 0; i < 2; i++) {
                const request = createMockRequest({
                    ip: "different-ip-each-time-" + i,
                    headers: { "x-session-token": sessionToken }
                });
                const reply = createMockReply();
                await middleware(request, reply);
                assertNoResponse(reply);
            }

            // 3rd request should be blocked (same session, different IP)
            const request = createMockRequest({
                ip: "another-ip",
                headers: { "x-session-token": sessionToken }
            });
            const reply = createMockReply();
            await middleware(request, reply);

            assertErrorResponse(reply, 429);
        });

        it("should use session token from body for rate limiting", async () => {
            const middleware = createChatInterfaceRateLimiter({
                limitPerMinute: 2,
                windowSeconds: 60
            });

            const sessionToken = `body-session-${Date.now()}`;

            // Make 2 requests
            for (let i = 0; i < 2; i++) {
                const request = createMockRequest({
                    ip: `ip-${i}`,
                    headers: {},
                    body: { sessionToken, message: "test" }
                });
                const reply = createMockReply();
                await middleware(request, reply);
                assertNoResponse(reply);
            }

            // 3rd should be blocked
            const request = createMockRequest({
                ip: "final-ip",
                headers: {},
                body: { sessionToken, message: "test" }
            });
            const reply = createMockReply();
            await middleware(request, reply);

            assertErrorResponse(reply, 429);
        });

        it("should track session and IP limits separately", async () => {
            const middleware = createChatInterfaceRateLimiter({
                limitPerMinute: 2,
                windowSeconds: 60
            });

            const sessionToken = `separate-session-${Date.now()}`;
            const ip = `separate-ip-${Date.now()}`;

            // Use up session limit
            for (let i = 0; i < 2; i++) {
                const request = createMockRequest({
                    ip: `random-ip-${i}`,
                    headers: { "x-session-token": sessionToken }
                });
                await middleware(request, createMockReply());
            }

            // IP-based request should still work (different tracking)
            const request = createMockRequest({
                ip,
                headers: {} // No session token, will use IP
            });
            const reply = createMockReply();
            await middleware(request, reply);

            assertNoResponse(reply);
        });
    });

    describe("Window expiration", () => {
        it("should reset count after window expires", async () => {
            jest.useFakeTimers();

            const middleware = createChatInterfaceRateLimiter({
                limitPerMinute: 2,
                windowSeconds: 1 // 1 second window for testing
            });

            const ip = `expiring-ip-${Date.now()}`;

            // Use up the limit
            for (let i = 0; i < 2; i++) {
                const request = createMockRequest({ ip, headers: {} });
                await middleware(request, createMockReply());
            }

            // Should be blocked
            const blockedRequest = createMockRequest({ ip, headers: {} });
            const blockedReply = createMockReply();
            await middleware(blockedRequest, blockedReply);
            assertErrorResponse(blockedReply, 429);

            // Advance time past the window
            jest.advanceTimersByTime(1100); // 1.1 seconds

            // Should be allowed again
            const newRequest = createMockRequest({ ip, headers: {} });
            const newReply = createMockReply();
            await middleware(newRequest, newReply);
            assertNoResponse(newReply);

            jest.useRealTimers();
        });
    });

    describe("Retry-After calculation", () => {
        it("should return correct retry-after seconds", async () => {
            jest.useFakeTimers();
            const now = Date.now();
            jest.setSystemTime(now);

            const middleware = createChatInterfaceRateLimiter({
                limitPerMinute: 1,
                windowSeconds: 60
            });

            const ip = `retry-after-ip-${now}`;

            // Use up the limit
            const request1 = createMockRequest({ ip, headers: {} });
            await middleware(request1, createMockReply());

            // Advance 30 seconds
            jest.advanceTimersByTime(30000);

            // Try again (should be blocked with ~30s retry-after)
            const request2 = createMockRequest({ ip, headers: {} });
            const reply = createMockReply();
            await middleware(request2, reply);

            assertErrorResponse(reply, 429);
            const body = reply._tracking.sentBody as RateLimitResponseBody;
            // Should be approximately 30 seconds remaining
            expect(body.retryAfter).toBeLessThanOrEqual(31);
            expect(body.retryAfter).toBeGreaterThan(0);

            jest.useRealTimers();
        });
    });
});

describe("chatInterfaceRateLimiter (default instance)", () => {
    it("should exist as a middleware function", () => {
        expect(chatInterfaceRateLimiter).toBeDefined();
        expect(typeof chatInterfaceRateLimiter).toBe("function");
    });

    it("should use default limit of 10 per minute", async () => {
        const ip = `default-instance-ip-${Date.now()}`;

        // Make 10 requests (should all pass)
        for (let i = 0; i < 10; i++) {
            const request = createMockRequest({ ip, headers: {} });
            const reply = createMockReply();
            await chatInterfaceRateLimiter(request, reply);
            assertNoResponse(reply);
        }

        // 11th should be blocked
        const request = createMockRequest({ ip, headers: {} });
        const reply = createMockReply();
        await chatInterfaceRateLimiter(request, reply);
        assertErrorResponse(reply, 429);
    });
});

describe("getChatInterfaceRateLimiter", () => {
    it("should create custom rate limiter with specified limits", async () => {
        const customLimiter = getChatInterfaceRateLimiter(3, 30);
        const ip = `custom-limiter-ip-${Date.now()}`;

        // Make 3 requests
        for (let i = 0; i < 3; i++) {
            const request = createMockRequest({ ip, headers: {} });
            const reply = createMockReply();
            await customLimiter(request, reply);
            assertNoResponse(reply);
        }

        // 4th should be blocked
        const request = createMockRequest({ ip, headers: {} });
        const reply = createMockReply();
        await customLimiter(request, reply);
        assertErrorResponse(reply, 429);
    });
});
