import { FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../core/logging";

const logger = createServiceLogger("ChatInterfaceRateLimiter");

// In-memory rate limit tracking
// Note: In production with multiple instances, use Redis
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// Track by session token for authenticated chat sessions
const sessionLimits = new Map<string, RateLimitEntry>();
// Fallback to IP for pre-session requests
const ipLimits = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of sessionLimits.entries()) {
        if (entry.resetAt <= now) {
            sessionLimits.delete(key);
        }
    }
    for (const [key, entry] of ipLimits.entries()) {
        if (entry.resetAt <= now) {
            ipLimits.delete(key);
        }
    }
}, 60000); // Clean up every minute

export interface ChatRateLimitOptions {
    limitPerMinute: number;
    windowSeconds: number;
}

/**
 * Creates a rate limiter middleware for chat interface messages
 * Uses session token if available, otherwise falls back to IP
 * @param options Rate limit configuration
 */
export function createChatInterfaceRateLimiter(
    options: ChatRateLimitOptions = {
        limitPerMinute: 10,
        windowSeconds: 60
    }
) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const now = Date.now();
        const windowMs = options.windowSeconds * 1000;

        // Get session token from header or body
        const sessionToken =
            (request.headers["x-session-token"] as string) ||
            ((request.body as Record<string, unknown>)?.sessionToken as string);

        // Determine the rate limit key
        const limitKey = sessionToken || request.ip;
        const limitsMap = sessionToken ? sessionLimits : ipLimits;

        const entry = limitsMap.get(limitKey);

        if (entry && entry.resetAt > now) {
            // Within the rate limit window
            if (entry.count >= options.limitPerMinute) {
                logger.warn(
                    {
                        key: sessionToken ? "session" : "ip",
                        limitKey: limitKey.substring(0, 8) + "...",
                        count: entry.count
                    },
                    "Rate limit exceeded for chat message"
                );
                return reply.status(429).send({
                    success: false,
                    error: "Too many messages. Please wait before sending another.",
                    retryAfter: Math.ceil((entry.resetAt - now) / 1000)
                });
            }
            // Increment count
            entry.count++;
        } else {
            // New window
            limitsMap.set(limitKey, {
                count: 1,
                resetAt: now + windowMs
            });
        }

        // Continue to handler
    };
}

/**
 * Default rate limiter instance (10 messages per minute)
 */
export const chatInterfaceRateLimiter = createChatInterfaceRateLimiter({
    limitPerMinute: 10,
    windowSeconds: 60
});

/**
 * Get custom rate limiter based on chat interface settings
 */
export function getChatInterfaceRateLimiter(limitMessages: number, windowSeconds: number) {
    return createChatInterfaceRateLimiter({
        limitPerMinute: limitMessages,
        windowSeconds: windowSeconds
    });
}
