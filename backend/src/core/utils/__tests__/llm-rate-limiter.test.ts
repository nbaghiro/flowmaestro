/**
 * Tests for LLM Rate Limiter
 */

// Mock pipeline - defined before import
const mockPipeline = {
    zremrangebyscore: jest.fn().mockReturnThis(),
    zcard: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    zadd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    incr: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    decr: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn()
};

// Mock Redis - defined before import
const mockRedis = {
    pipeline: jest.fn().mockReturnValue(mockPipeline),
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    zadd: jest.fn(),
    expire: jest.fn(),
    del: jest.fn()
};

// Mock must be before import
jest.mock("../../../services/redis", () => ({
    redis: mockRedis
}));

import { LLMRateLimiter, RateLimitExceededError, DEFAULT_LLM_RATE_LIMITS } from "../llm-rate-limiter";

describe("LLMRateLimiter", () => {
    let rateLimiter: LLMRateLimiter;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock return value after clearAllMocks
        mockRedis.pipeline.mockReturnValue(mockPipeline);
        rateLimiter = new LLMRateLimiter();
    });

    describe("checkLimit", () => {
        it("should allow request when under rate limit", async () => {
            // Mock pipeline results: [zremrangebyscore, zremrangebyscore, zcard, zcard, get]
            mockPipeline.exec.mockResolvedValue([
                [null, 0], // zremrangebyscore calls
                [null, 0],
                [null, 10], // callCount = 10
                [null, 5],  // tokenEntries = 5
                [null, "2"] // concurrent = 2
            ]);

            const result = await rateLimiter.checkLimit("workspace-1", "user-1");

            expect(result.allowed).toBe(true);
            expect(result.currentUsage).toEqual({
                callsPerMinute: 10,
                tokensPerMinute: 5,
                concurrentExecutions: 2
            });
        });

        it("should reject request when call rate limit exceeded", async () => {
            const maxCalls = Math.floor(
                DEFAULT_LLM_RATE_LIMITS.maxCallsPerMinute * DEFAULT_LLM_RATE_LIMITS.burstMultiplier
            );

            mockPipeline.exec.mockResolvedValue([
                [null, 0],
                [null, 0],
                [null, maxCalls + 1], // Over limit
                [null, 5],
                [null, "2"]
            ]);

            const result = await rateLimiter.checkLimit("workspace-1", "user-1");

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain("Rate limit exceeded");
            expect(result.retryAfterMs).toBeDefined();
        });

        it("should reject request when concurrent execution limit exceeded", async () => {
            const maxConcurrent = Math.floor(
                DEFAULT_LLM_RATE_LIMITS.maxConcurrentExecutions * DEFAULT_LLM_RATE_LIMITS.burstMultiplier
            );

            mockPipeline.exec.mockResolvedValue([
                [null, 0],
                [null, 0],
                [null, 5], // Under call limit
                [null, 5],
                [null, String(maxConcurrent + 1)] // Over concurrent limit
            ]);

            const result = await rateLimiter.checkLimit("workspace-1", "user-1");

            expect(result.allowed).toBe(false);
            expect(result.reason).toContain("Concurrent execution limit exceeded");
        });

        it("should allow request when Redis is unavailable (fail open)", async () => {
            mockPipeline.exec.mockResolvedValue(null);

            const result = await rateLimiter.checkLimit("workspace-1", "user-1");

            expect(result.allowed).toBe(true);
        });

        it("should allow request when Redis throws error (fail open)", async () => {
            mockPipeline.exec.mockRejectedValue(new Error("Redis connection failed"));

            const result = await rateLimiter.checkLimit("workspace-1", "user-1");

            expect(result.allowed).toBe(true);
        });
    });

    describe("recordCall", () => {
        it("should record call to Redis", async () => {
            mockPipeline.exec.mockResolvedValue([]);

            await rateLimiter.recordCall("workspace-1", "user-1", 1000);

            expect(mockRedis.pipeline).toHaveBeenCalled();
            expect(mockPipeline.zadd).toHaveBeenCalled();
            expect(mockPipeline.expire).toHaveBeenCalled();
            expect(mockPipeline.exec).toHaveBeenCalled();
        });

        it("should not throw when Redis fails", async () => {
            mockPipeline.exec.mockRejectedValue(new Error("Redis error"));

            await expect(
                rateLimiter.recordCall("workspace-1", "user-1", 1000)
            ).resolves.not.toThrow();
        });
    });

    describe("incrementConcurrent / decrementConcurrent", () => {
        it("should increment concurrent counter", async () => {
            mockPipeline.exec.mockResolvedValue([]);

            await rateLimiter.incrementConcurrent("workspace-1", "exec-1");

            expect(mockPipeline.incr).toHaveBeenCalled();
            expect(mockPipeline.set).toHaveBeenCalled();
            expect(mockPipeline.expire).toHaveBeenCalled();
        });

        it("should decrement concurrent counter", async () => {
            mockPipeline.exec.mockResolvedValue([]);
            mockRedis.get.mockResolvedValue("5");

            await rateLimiter.decrementConcurrent("workspace-1", "exec-1");

            expect(mockPipeline.decr).toHaveBeenCalled();
            expect(mockPipeline.del).toHaveBeenCalled();
        });

        it("should reset counter to 0 if it goes negative", async () => {
            mockPipeline.exec.mockResolvedValue([]);
            mockRedis.get.mockResolvedValue("-1");

            await rateLimiter.decrementConcurrent("workspace-1", "exec-1");

            expect(mockRedis.set).toHaveBeenCalledWith(
                expect.stringContaining("concurrent"),
                "0"
            );
        });
    });

    describe("getUsageStats", () => {
        it("should return current usage stats", async () => {
            mockPipeline.exec.mockResolvedValue([
                [null, 0],
                [null, 25],
                [null, "3"]
            ]);

            const stats = await rateLimiter.getUsageStats("workspace-1");

            expect(stats.callsPerMinute).toBe(25);
            expect(stats.concurrentExecutions).toBe(3);
            expect(stats.limits).toEqual(DEFAULT_LLM_RATE_LIMITS);
        });
    });
});

describe("RateLimitExceededError", () => {
    it("should create error with correct properties", () => {
        const result = {
            allowed: false,
            reason: "Rate limit exceeded",
            retryAfterMs: 5000,
            currentUsage: {
                callsPerMinute: 100,
                tokensPerMinute: 50000,
                concurrentExecutions: 5
            }
        };

        const error = new RateLimitExceededError(result);

        expect(error.name).toBe("RateLimitExceededError");
        expect(error.message).toBe("Rate limit exceeded");
        expect(error.retryAfterMs).toBe(5000);
        expect(error.currentUsage).toEqual(result.currentUsage);
    });
});
