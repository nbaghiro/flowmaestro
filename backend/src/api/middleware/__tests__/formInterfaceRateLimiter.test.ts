/**
 * Form Interface Rate Limiter Tests
 *
 * Tests for in-memory form submission rate limiting (formInterfaceRateLimiter.ts)
 */

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
    createFormInterfaceRateLimiter,
    formInterfaceRateLimiter
} from "../formInterfaceRateLimiter";
import type { FastifyRequest, FastifyReply } from "fastify";

describe("formInterfaceRateLimiter", () => {
    let mockRequest: Partial<FastifyRequest>;
    let mockReply: Partial<FastifyReply>;

    beforeEach(() => {
        jest.useFakeTimers();
        mockRequest = {
            ip: "192.168.1.1"
        };
        mockReply = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe("createFormInterfaceRateLimiter", () => {
        it("should create rate limiter with default limit of 10", () => {
            const limiter = createFormInterfaceRateLimiter();

            expect(limiter).toBeInstanceOf(Function);
        });

        it("should create rate limiter with custom limit", () => {
            const limiter = createFormInterfaceRateLimiter(5);

            expect(limiter).toBeInstanceOf(Function);
        });
    });

    describe("rate limiting behavior", () => {
        it("should allow requests under the limit", async () => {
            const limiter = createFormInterfaceRateLimiter(5);

            // Make 5 requests (at the limit)
            for (let i = 0; i < 5; i++) {
                await limiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
            }

            // Should not have sent rate limit response
            expect(mockReply.status).not.toHaveBeenCalledWith(429);
        });

        it("should block requests over the limit", async () => {
            const limiter = createFormInterfaceRateLimiter(3);

            // Make 3 requests (at the limit)
            for (let i = 0; i < 3; i++) {
                await limiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
            }

            // 4th request should be blocked
            await limiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockReply.status).toHaveBeenCalledWith(429);
            expect(mockReply.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.stringContaining("Too many submissions")
                })
            );
        });

        it("should track requests per IP", async () => {
            const limiter = createFormInterfaceRateLimiter(2);

            // Use unique IPs for this test to avoid state pollution
            const ip1 = `test-ip-${Date.now()}-1`;
            const ip2 = `test-ip-${Date.now()}-2`;

            // First IP makes 2 requests
            for (let i = 0; i < 2; i++) {
                await limiter({ ip: ip1 } as FastifyRequest, mockReply as FastifyReply);
            }

            // Different IP should still be allowed
            await limiter({ ip: ip2 } as FastifyRequest, mockReply as FastifyReply);

            // First IP should be blocked on 3rd request
            await limiter({ ip: ip1 } as FastifyRequest, mockReply as FastifyReply);

            expect(mockReply.status).toHaveBeenCalledWith(429);
        });

        it("should reset after window expires", async () => {
            const limiter = createFormInterfaceRateLimiter(2);

            // Use up the limit
            for (let i = 0; i < 2; i++) {
                await limiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
            }

            // This should be blocked
            await limiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
            expect(mockReply.status).toHaveBeenCalledWith(429);

            // Reset mocks
            (mockReply.status as jest.Mock).mockClear();
            (mockReply.send as jest.Mock).mockClear();

            // Advance time past the 1-minute window
            jest.advanceTimersByTime(61000);

            // Should be allowed again
            await limiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockReply.status).not.toHaveBeenCalledWith(429);
        });
    });

    describe("response format", () => {
        it("should include retryAfter in response", async () => {
            const limiter = createFormInterfaceRateLimiter(1);

            // Use up the limit
            await limiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

            // Get blocked
            await limiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

            expect(mockReply.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    retryAfter: expect.any(Number)
                })
            );
        });
    });

    describe("default instance", () => {
        it("should export default rate limiter instance", () => {
            expect(formInterfaceRateLimiter).toBeInstanceOf(Function);
        });

        it("should use 10 requests per minute by default", async () => {
            // Make 10 requests
            for (let i = 0; i < 10; i++) {
                await formInterfaceRateLimiter(
                    { ip: "10.0.0.1" } as FastifyRequest,
                    mockReply as FastifyReply
                );
            }

            // 11th request should be blocked
            await formInterfaceRateLimiter(
                { ip: "10.0.0.1" } as FastifyRequest,
                mockReply as FastifyReply
            );

            expect(mockReply.status).toHaveBeenCalledWith(429);
        });
    });
});
