/**
 * LLM Rate Limiter
 *
 * Prevents runaway costs by limiting LLM API calls per workspace/user.
 * Uses Redis for distributed rate limiting across multiple instances.
 *
 * Critical Gap Fix: Prevents agents from making excessive LLM calls
 * that could lead to unexpected costs.
 */

import { redis } from "../../services/redis";
import { createServiceLogger } from "../logging";

const logger = createServiceLogger("LLMRateLimiter");

/**
 * Rate limit configuration
 */
export interface LLMRateLimitConfig {
    /** Maximum calls per minute per workspace */
    maxCallsPerMinute: number;
    /** Maximum tokens per minute per workspace (approximate) */
    maxTokensPerMinute: number;
    /** Maximum concurrent executions per workspace */
    maxConcurrentExecutions: number;
    /** Grace period multiplier for burst handling (e.g., 1.2 = 20% burst allowance) */
    burstMultiplier: number;
}

/**
 * Default rate limits - conservative defaults to prevent cost runaway
 */
export const DEFAULT_LLM_RATE_LIMITS: LLMRateLimitConfig = {
    maxCallsPerMinute: 60, // 1 call per second average
    maxTokensPerMinute: 500000, // ~500k tokens/min
    maxConcurrentExecutions: 10, // 10 parallel agent executions
    burstMultiplier: 1.5 // Allow 50% burst
};

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
    allowed: boolean;
    reason?: string;
    retryAfterMs?: number;
    currentUsage?: {
        callsPerMinute: number;
        tokensPerMinute: number;
        concurrentExecutions: number;
    };
}

/**
 * LLM Rate Limiter using Redis sliding window
 */
export class LLMRateLimiter {
    private readonly config: LLMRateLimitConfig;
    private readonly keyPrefix = "llm_rate_limit";

    constructor(config: Partial<LLMRateLimitConfig> = {}) {
        this.config = { ...DEFAULT_LLM_RATE_LIMITS, ...config };
    }

    /**
     * Check if an LLM call is allowed for a workspace
     */
    async checkLimit(workspaceId: string, userId: string): Promise<RateLimitResult> {
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute window
        const windowStart = now - windowMs;

        const callsKey = `${this.keyPrefix}:calls:${workspaceId}`;
        const tokensKey = `${this.keyPrefix}:tokens:${workspaceId}`;
        const concurrentKey = `${this.keyPrefix}:concurrent:${workspaceId}`;

        try {
            // Use Redis pipeline for atomic operations
            const pipeline = redis.pipeline();

            // Remove old entries from sliding window
            pipeline.zremrangebyscore(callsKey, 0, windowStart);
            pipeline.zremrangebyscore(tokensKey, 0, windowStart);

            // Count current usage
            pipeline.zcard(callsKey);
            pipeline.zcard(tokensKey);
            pipeline.get(concurrentKey);

            const results = await pipeline.exec();

            if (!results) {
                // Redis unavailable - fail open with warning
                logger.warn({ workspaceId, userId }, "Redis unavailable, allowing request");
                return { allowed: true };
            }

            const callCount = (results[2]?.[1] as number) || 0;
            const tokenEntries = (results[3]?.[1] as number) || 0;
            const concurrent = parseInt((results[4]?.[1] as string) || "0", 10);

            const effectiveMaxCalls = Math.floor(
                this.config.maxCallsPerMinute * this.config.burstMultiplier
            );
            const effectiveMaxConcurrent = Math.floor(
                this.config.maxConcurrentExecutions * this.config.burstMultiplier
            );

            // Check call rate limit
            if (callCount >= effectiveMaxCalls) {
                logger.warn(
                    { workspaceId, userId, callCount, limit: effectiveMaxCalls },
                    "LLM call rate limit exceeded"
                );
                return {
                    allowed: false,
                    reason: `Rate limit exceeded: ${callCount}/${effectiveMaxCalls} calls per minute`,
                    retryAfterMs: windowMs - (now - windowStart),
                    currentUsage: {
                        callsPerMinute: callCount,
                        tokensPerMinute: tokenEntries,
                        concurrentExecutions: concurrent
                    }
                };
            }

            // Check concurrent execution limit
            if (concurrent >= effectiveMaxConcurrent) {
                logger.warn(
                    { workspaceId, userId, concurrent, limit: effectiveMaxConcurrent },
                    "LLM concurrent execution limit exceeded"
                );
                return {
                    allowed: false,
                    reason: `Concurrent execution limit exceeded: ${concurrent}/${effectiveMaxConcurrent} active executions`,
                    retryAfterMs: 5000, // Suggest retry in 5 seconds
                    currentUsage: {
                        callsPerMinute: callCount,
                        tokensPerMinute: tokenEntries,
                        concurrentExecutions: concurrent
                    }
                };
            }

            return {
                allowed: true,
                currentUsage: {
                    callsPerMinute: callCount,
                    tokensPerMinute: tokenEntries,
                    concurrentExecutions: concurrent
                }
            };
        } catch (error) {
            // Redis error - fail open with warning
            logger.error(
                { err: error instanceof Error ? error : new Error(String(error)), workspaceId },
                "Rate limit check failed, allowing request"
            );
            return { allowed: true };
        }
    }

    /**
     * Record an LLM call (should be called after checkLimit returns allowed: true)
     */
    async recordCall(
        workspaceId: string,
        userId: string,
        estimatedTokens: number = 1000
    ): Promise<void> {
        const now = Date.now();
        const callsKey = `${this.keyPrefix}:calls:${workspaceId}`;
        const tokensKey = `${this.keyPrefix}:tokens:${workspaceId}`;
        const callId = `${userId}:${now}:${Math.random().toString(36).slice(2)}`;

        try {
            const pipeline = redis.pipeline();

            // Add to sliding window sorted sets
            pipeline.zadd(callsKey, now, callId);
            pipeline.zadd(tokensKey, now, `${callId}:${estimatedTokens}`);

            // Set expiry on keys (2 minutes to be safe)
            pipeline.expire(callsKey, 120);
            pipeline.expire(tokensKey, 120);

            await pipeline.exec();
        } catch (error) {
            logger.error(
                { err: error instanceof Error ? error : new Error(String(error)), workspaceId },
                "Failed to record LLM call"
            );
        }
    }

    /**
     * Record actual token usage after LLM call completes
     */
    async recordTokenUsage(
        workspaceId: string,
        promptTokens: number,
        completionTokens: number
    ): Promise<void> {
        const now = Date.now();
        const tokensKey = `${this.keyPrefix}:tokens:${workspaceId}`;
        const totalTokens = promptTokens + completionTokens;

        try {
            // Add actual usage entry
            await redis.zadd(tokensKey, now, `actual:${now}:${totalTokens}`);
        } catch (error) {
            logger.error(
                { err: error instanceof Error ? error : new Error(String(error)), workspaceId },
                "Failed to record token usage"
            );
        }
    }

    /**
     * Increment concurrent execution counter
     */
    async incrementConcurrent(workspaceId: string, executionId: string): Promise<void> {
        const concurrentKey = `${this.keyPrefix}:concurrent:${workspaceId}`;
        const executionKey = `${this.keyPrefix}:execution:${executionId}`;

        try {
            const pipeline = redis.pipeline();
            pipeline.incr(concurrentKey);
            pipeline.set(executionKey, workspaceId, "EX", 3600); // 1 hour max execution
            pipeline.expire(concurrentKey, 3600);
            await pipeline.exec();
        } catch (error) {
            logger.error(
                { err: error instanceof Error ? error : new Error(String(error)), workspaceId },
                "Failed to increment concurrent counter"
            );
        }
    }

    /**
     * Decrement concurrent execution counter
     */
    async decrementConcurrent(workspaceId: string, executionId: string): Promise<void> {
        const concurrentKey = `${this.keyPrefix}:concurrent:${workspaceId}`;
        const executionKey = `${this.keyPrefix}:execution:${executionId}`;

        try {
            const pipeline = redis.pipeline();
            pipeline.decr(concurrentKey);
            pipeline.del(executionKey);
            await pipeline.exec();

            // Ensure counter doesn't go negative
            const count = await redis.get(concurrentKey);
            if (count && parseInt(count, 10) < 0) {
                await redis.set(concurrentKey, "0");
            }
        } catch (error) {
            logger.error(
                { err: error instanceof Error ? error : new Error(String(error)), workspaceId },
                "Failed to decrement concurrent counter"
            );
        }
    }

    /**
     * Get current usage stats for a workspace
     */
    async getUsageStats(workspaceId: string): Promise<{
        callsPerMinute: number;
        concurrentExecutions: number;
        limits: LLMRateLimitConfig;
    }> {
        const now = Date.now();
        const windowStart = now - 60 * 1000;

        const callsKey = `${this.keyPrefix}:calls:${workspaceId}`;
        const concurrentKey = `${this.keyPrefix}:concurrent:${workspaceId}`;

        try {
            const pipeline = redis.pipeline();
            pipeline.zremrangebyscore(callsKey, 0, windowStart);
            pipeline.zcard(callsKey);
            pipeline.get(concurrentKey);

            const results = await pipeline.exec();

            return {
                callsPerMinute: (results?.[1]?.[1] as number) || 0,
                concurrentExecutions: parseInt((results?.[2]?.[1] as string) || "0", 10),
                limits: this.config
            };
        } catch (error) {
            logger.error(
                { err: error instanceof Error ? error : new Error(String(error)), workspaceId },
                "Failed to get usage stats"
            );
            return {
                callsPerMinute: 0,
                concurrentExecutions: 0,
                limits: this.config
            };
        }
    }
}

/**
 * Singleton instance with default configuration
 */
let llmRateLimiterInstance: LLMRateLimiter | null = null;

export function getLLMRateLimiter(config?: Partial<LLMRateLimitConfig>): LLMRateLimiter {
    if (!llmRateLimiterInstance || config) {
        llmRateLimiterInstance = new LLMRateLimiter(config);
    }
    return llmRateLimiterInstance;
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends Error {
    public readonly retryAfterMs?: number;
    public readonly currentUsage?: RateLimitResult["currentUsage"];

    constructor(result: RateLimitResult) {
        super(result.reason || "Rate limit exceeded");
        this.name = "RateLimitExceededError";
        this.retryAfterMs = result.retryAfterMs;
        this.currentUsage = result.currentUsage;
    }
}
