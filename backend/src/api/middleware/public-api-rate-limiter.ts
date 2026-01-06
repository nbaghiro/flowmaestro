import * as crypto from "crypto";
import { FastifyRequest, FastifyReply } from "fastify";
import { createClient } from "redis";
import { config } from "../../core/config";
import { createServiceLogger } from "../../core/logging";
import type { PublicApiErrorCode } from "./api-key-auth";

const logger = createServiceLogger("PublicApiRateLimiter");

/**
 * Redis client for rate limiting.
 * Uses a singleton pattern with lazy initialization.
 */
let redisClient: ReturnType<typeof createClient> | null = null;
let isConnected = false;

async function getRedisClient(): Promise<ReturnType<typeof createClient>> {
    if (!redisClient) {
        redisClient = createClient({
            socket: {
                host: config.redis.host,
                port: config.redis.port
            }
        });

        redisClient.on("error", (err) => {
            logger.error({ error: err }, "Redis rate limiter error");
        });
    }

    if (!isConnected) {
        await redisClient.connect();
        isConnected = true;
    }

    return redisClient;
}

/**
 * Standard public API error response.
 */
interface PublicApiErrorResponse {
    error: {
        code: PublicApiErrorCode;
        message: string;
        details?: Record<string, unknown>;
    };
    meta?: {
        request_id: string;
        timestamp: string;
    };
}

/**
 * Rate limit check result.
 */
interface RateLimitResult {
    allowed: boolean;
    minuteCount: number;
    minuteLimit: number;
    minuteRemaining: number;
    minuteReset: number;
    dayCount: number;
    dayLimit: number;
    dayRemaining: number;
}

/**
 * Check rate limits for an API key.
 * Uses two windows: per-minute and per-day.
 */
async function checkRateLimit(
    apiKeyId: string,
    minuteLimit: number,
    dayLimit: number
): Promise<RateLimitResult> {
    const redis = await getRedisClient();
    const now = Math.floor(Date.now() / 1000);

    // Calculate window keys
    const minuteWindow = Math.floor(now / 60);
    const dayWindow = Math.floor(now / 86400);

    const minuteKey = `ratelimit:v1:${apiKeyId}:minute:${minuteWindow}`;
    const dayKey = `ratelimit:v1:${apiKeyId}:day:${dayWindow}`;

    // Atomic increment with pipeline
    const pipeline = redis.multi();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 120); // 2 minutes TTL
    pipeline.incr(dayKey);
    pipeline.expire(dayKey, 172800); // 2 days TTL

    const results = await pipeline.exec();

    const minuteCount = (results?.[0] as number) || 0;
    const dayCount = (results?.[2] as number) || 0;

    const minuteRemaining = Math.max(0, minuteLimit - minuteCount);
    const dayRemaining = Math.max(0, dayLimit - dayCount);

    // Calculate when the minute window resets (next minute boundary)
    const minuteReset = (minuteWindow + 1) * 60;

    const allowed = minuteCount <= minuteLimit && dayCount <= dayLimit;

    return {
        allowed,
        minuteCount,
        minuteLimit,
        minuteRemaining,
        minuteReset,
        dayCount,
        dayLimit,
        dayRemaining
    };
}

/**
 * Set rate limit headers on the response.
 */
function setRateLimitHeaders(reply: FastifyReply, result: RateLimitResult): void {
    reply.header("X-RateLimit-Limit", result.minuteLimit.toString());
    reply.header("X-RateLimit-Remaining", result.minuteRemaining.toString());
    reply.header("X-RateLimit-Reset", result.minuteReset.toString());
    reply.header("X-RateLimit-Limit-Day", result.dayLimit.toString());
    reply.header("X-RateLimit-Remaining-Day", result.dayRemaining.toString());
}

/**
 * Public API rate limiting middleware.
 *
 * Enforces per-minute and per-day rate limits based on API key configuration.
 * Must be used after apiKeyAuthMiddleware.
 */
export async function publicApiRateLimiterMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const apiKey = request.apiKey;

    // Skip rate limiting if no API key (shouldn't happen after auth middleware)
    if (!apiKey) {
        return;
    }

    try {
        const result = await checkRateLimit(
            apiKey.id,
            apiKey.rate_limit_per_minute,
            apiKey.rate_limit_per_day
        );

        // Always set rate limit headers
        setRateLimitHeaders(reply, result);

        if (!result.allowed) {
            const now = Math.floor(Date.now() / 1000);
            const isMinuteLimitExceeded = result.minuteCount > result.minuteLimit;

            let retryAfter: number;
            let message: string;
            let window: string;

            if (isMinuteLimitExceeded) {
                retryAfter = result.minuteReset - now;
                window = "minute";
                message = `Rate limit exceeded. Please retry after ${retryAfter} seconds.`;
            } else {
                // Day limit exceeded
                const secondsUntilMidnight = 86400 - (now % 86400);
                retryAfter = secondsUntilMidnight;
                window = "day";
                message = "Daily rate limit exceeded. Limit resets at midnight UTC.";
            }

            reply.header("Retry-After", retryAfter.toString());

            const response: PublicApiErrorResponse = {
                error: {
                    code: "rate_limit_exceeded",
                    message,
                    details: {
                        limit: isMinuteLimitExceeded ? result.minuteLimit : result.dayLimit,
                        window,
                        retry_after: retryAfter
                    }
                },
                meta: {
                    request_id: crypto.randomUUID(),
                    timestamp: new Date().toISOString()
                }
            };

            reply.status(429).send(response);
            return;
        }
    } catch (error) {
        // If Redis fails, log and allow the request (fail open)
        logger.error({ error, apiKeyId: apiKey.id }, "Rate limit check failed");
        // Continue without rate limiting
    }
}

/**
 * Create a custom rate limiter with specific limits.
 * Useful for endpoints that need different limits than the API key defaults.
 */
export function createPublicApiRateLimiter(minuteLimit: number, dayLimit: number) {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const apiKey = request.apiKey;

        if (!apiKey) {
            return;
        }

        try {
            // Use the custom limits instead of API key defaults
            const result = await checkRateLimit(apiKey.id, minuteLimit, dayLimit);

            setRateLimitHeaders(reply, result);

            if (!result.allowed) {
                const now = Math.floor(Date.now() / 1000);
                const retryAfter = result.minuteReset - now;

                reply.header("Retry-After", retryAfter.toString());

                const response: PublicApiErrorResponse = {
                    error: {
                        code: "rate_limit_exceeded",
                        message: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
                        details: {
                            limit: minuteLimit,
                            window: "minute",
                            retry_after: retryAfter
                        }
                    },
                    meta: {
                        request_id: crypto.randomUUID(),
                        timestamp: new Date().toISOString()
                    }
                };

                reply.status(429).send(response);
                return;
            }
        } catch (error) {
            logger.error({ error, apiKeyId: apiKey.id }, "Rate limit check failed");
        }
    };
}

/**
 * Disconnect from Redis (for graceful shutdown).
 */
export async function disconnectRateLimiter(): Promise<void> {
    if (redisClient && isConnected) {
        await redisClient.disconnect();
        isConnected = false;
    }
}
