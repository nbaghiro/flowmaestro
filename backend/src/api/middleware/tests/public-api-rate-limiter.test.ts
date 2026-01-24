/**
 * Public API Rate Limiter Tests
 *
 * Tests for Redis-based public API rate limiting (public-api-rate-limiter.ts)
 */

// Mock Redis
const mockIncr = jest.fn();
const mockExpire = jest.fn();
const mockMulti = jest.fn();
const mockExec = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockOn = jest.fn();

jest.mock("redis", () => ({
    createClient: jest.fn().mockImplementation(() => ({
        incr: mockIncr,
        expire: mockExpire,
        multi: mockMulti.mockReturnValue({
            incr: jest.fn().mockReturnThis(),
            expire: jest.fn().mockReturnThis(),
            exec: mockExec
        }),
        connect: mockConnect,
        disconnect: mockDisconnect,
        on: mockOn
    }))
}));

// Mock config
jest.mock("../../../core/config", () => ({
    config: {
        redis: {
            host: "localhost",
            port: 6379
        }
    }
}));

// Mock logging
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
    createPublicApiRateLimiter,
    publicApiRateLimiterMiddleware,
    disconnectRateLimiter
} from "../public-api-rate-limiter";
import type { FastifyRequest, FastifyReply } from "fastify";

// Use a simple mock request shape for testing
type MockRequestWithApiKey = {
    apiKey?: {
        id: string;
        rate_limit_per_minute: number;
        rate_limit_per_day: number;
    };
};

describe("public-api-rate-limiter", () => {
    let mockRequest: MockRequestWithApiKey;
    let mockReply: Partial<FastifyReply>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConnect.mockResolvedValue(undefined);
        mockExec.mockResolvedValue([5, true, 100, true]); // [minuteCount, expireResult, dayCount, expireResult]

        mockRequest = {
            apiKey: {
                id: "api-key-123",
                rate_limit_per_minute: 60,
                rate_limit_per_day: 10000
            }
        };
        mockReply = {
            status: jest.fn().mockReturnThis(),
            header: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
    });

    describe("publicApiRateLimiterMiddleware", () => {
        it("should allow requests under the limit", async () => {
            mockExec.mockResolvedValue([5, true, 100, true]);

            await publicApiRateLimiterMiddleware(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).not.toHaveBeenCalledWith(429);
        });

        it("should skip rate limiting if no API key", async () => {
            mockRequest.apiKey = undefined;

            await publicApiRateLimiterMiddleware(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            // Should return early without calling Redis
            expect(mockMulti).not.toHaveBeenCalled();
        });

        it("should block requests over the per-minute limit", async () => {
            mockExec.mockResolvedValue([61, true, 100, true]); // minuteCount > 60

            await publicApiRateLimiterMiddleware(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(429);
            expect(mockReply.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.objectContaining({
                        code: "rate_limit_exceeded"
                    })
                })
            );
        });

        it("should block requests over the per-day limit", async () => {
            mockExec.mockResolvedValue([5, true, 10001, true]); // dayCount > 10000

            await publicApiRateLimiterMiddleware(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(429);
        });

        it("should set rate limit headers", async () => {
            mockExec.mockResolvedValue([5, true, 100, true]);

            await publicApiRateLimiterMiddleware(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.header).toHaveBeenCalledWith("X-RateLimit-Limit", "60");
            expect(mockReply.header).toHaveBeenCalledWith("X-RateLimit-Remaining", "55");
            expect(mockReply.header).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String));
            expect(mockReply.header).toHaveBeenCalledWith("X-RateLimit-Limit-Day", "10000");
            expect(mockReply.header).toHaveBeenCalledWith("X-RateLimit-Remaining-Day", "9900");
        });

        it("should include Retry-After header when rate limited", async () => {
            mockExec.mockResolvedValue([61, true, 100, true]);

            await publicApiRateLimiterMiddleware(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.header).toHaveBeenCalledWith("Retry-After", expect.any(String));
        });

        it("should allow request if Redis fails (fail-open)", async () => {
            mockExec.mockRejectedValue(new Error("Redis connection error"));

            await publicApiRateLimiterMiddleware(
                mockRequest as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).not.toHaveBeenCalledWith(429);
            expect(mockReply.status).not.toHaveBeenCalledWith(500);
        });
    });

    describe("createPublicApiRateLimiter", () => {
        it("should create rate limiter with custom limits", () => {
            const limiter = createPublicApiRateLimiter(30, 5000);

            expect(limiter).toBeInstanceOf(Function);
        });

        it("should use custom limits instead of API key defaults", async () => {
            const limiter = createPublicApiRateLimiter(10, 1000);
            mockExec.mockResolvedValue([11, true, 100, true]); // Over custom limit of 10

            await limiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockReply.status).toHaveBeenCalledWith(429);
        });

        it("should skip if no API key", async () => {
            mockRequest.apiKey = undefined;
            const limiter = createPublicApiRateLimiter(10, 1000);

            await limiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockMulti).not.toHaveBeenCalled();
        });
    });

    describe("disconnectRateLimiter", () => {
        it("should be a function", () => {
            expect(typeof disconnectRateLimiter).toBe("function");
        });
    });
});
