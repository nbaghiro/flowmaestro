/**
 * Chat Interface Rate Limiter Tests
 *
 * Tests for Redis-based rate limiting middleware (chatInterfaceRateLimiter.ts)
 */

import {
    createMockRequest,
    createMockReply,
    assertErrorResponse,
    assertNoResponse
} from "../../../../__tests__/helpers/middleware-test-utils";

// Mock Redis
const mockZremrangebyscore = jest.fn();
const mockZcard = jest.fn();
const mockZrange = jest.fn();
const mockZadd = jest.fn();
const mockExpire = jest.fn();

jest.mock("../../../services/redis", () => ({
    redis: {
        zremrangebyscore: (...args: unknown[]) => mockZremrangebyscore(...args),
        zcard: (...args: unknown[]) => mockZcard(...args),
        zrange: (...args: unknown[]) => mockZrange(...args),
        zadd: (...args: unknown[]) => mockZadd(...args),
        expire: (...args: unknown[]) => mockExpire(...args)
    }
}));

import { chatInterfaceRateLimiter, checkChatRateLimit } from "../chatInterfaceRateLimiter";

describe("chatInterfaceRateLimiter", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: allow requests (count = 0)
        mockZremrangebyscore.mockResolvedValue(0);
        mockZcard.mockResolvedValue(0);
        mockZadd.mockResolvedValue(1);
        mockExpire.mockResolvedValue(1);
    });

    describe("IP-based rate limiting middleware", () => {
        it("should allow requests under the limit", async () => {
            mockZcard.mockResolvedValue(50); // 50 requests, limit is 100

            const request = createMockRequest({
                ip: "192.168.1.1",
                headers: {}
            });
            const reply = createMockReply();

            await chatInterfaceRateLimiter(request, reply);

            assertNoResponse(reply);
            expect(mockZadd).toHaveBeenCalled();
        });

        it("should block requests when limit is exceeded", async () => {
            mockZcard.mockResolvedValue(100); // At limit
            mockZrange.mockResolvedValue(["entry", String(Date.now() - 30000)]); // Oldest entry 30s ago

            const request = createMockRequest({
                ip: "192.168.1.1",
                headers: {}
            });
            const reply = createMockReply();

            await chatInterfaceRateLimiter(request, reply);

            assertErrorResponse(reply, 429);
            const body = reply._tracking.sentBody as { error: string; resetAt: number };
            expect(body.error).toContain("Too many requests");
            expect(body.resetAt).toBeDefined();
        });

        it("should use IP from request for rate limit key", async () => {
            const request = createMockRequest({
                ip: "10.0.0.1",
                headers: {}
            });
            const reply = createMockReply();

            await chatInterfaceRateLimiter(request, reply);

            expect(mockZremrangebyscore).toHaveBeenCalledWith(
                expect.stringContaining("chat-ip-rate:10.0.0.1"),
                expect.any(Number),
                expect.any(Number)
            );
        });
    });
});

describe("checkChatRateLimit", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockZremrangebyscore.mockResolvedValue(0);
        mockZcard.mockResolvedValue(0);
        mockZadd.mockResolvedValue(1);
        mockExpire.mockResolvedValue(1);
    });

    describe("Session-specific rate limiting", () => {
        it("should allow requests under the limit", async () => {
            mockZcard.mockResolvedValue(5); // 5 requests

            const result = await checkChatRateLimit("interface-123", "session-abc", 10, 60);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4); // 10 - (5 + 1)
        });

        it("should block requests at the limit", async () => {
            mockZcard.mockResolvedValue(10); // At limit of 10
            mockZrange.mockResolvedValue(["entry", String(Date.now() - 30000)]);

            const result = await checkChatRateLimit("interface-123", "session-abc", 10, 60);

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it("should use correct Redis key format", async () => {
            await checkChatRateLimit("my-interface", "my-session", 10, 60);

            expect(mockZremrangebyscore).toHaveBeenCalledWith(
                "chat-rate:my-interface:my-session",
                expect.any(Number),
                expect.any(Number)
            );
        });

        it("should add request to sliding window when allowed", async () => {
            mockZcard.mockResolvedValue(0);

            await checkChatRateLimit("interface-123", "session-abc", 10, 60);

            expect(mockZadd).toHaveBeenCalledWith(
                "chat-rate:interface-123:session-abc",
                expect.any(Number),
                expect.stringMatching(/^\d+-[\d.]+$/)
            );
        });

        it("should set expiry on the rate limit key", async () => {
            await checkChatRateLimit("interface-123", "session-abc", 10, 60);

            expect(mockExpire).toHaveBeenCalledWith(
                "chat-rate:interface-123:session-abc",
                65 // windowSeconds + 5
            );
        });

        it("should calculate remaining correctly", async () => {
            mockZcard.mockResolvedValue(7);

            const result = await checkChatRateLimit("interface-123", "session-abc", 10, 60);

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(2); // 10 - (7 + 1)
        });

        it("should not add to window when blocked", async () => {
            mockZcard.mockResolvedValue(10);
            mockZrange.mockResolvedValue(["entry", String(Date.now())]);

            await checkChatRateLimit("interface-123", "session-abc", 10, 60);

            expect(mockZadd).not.toHaveBeenCalled();
        });
    });
});
