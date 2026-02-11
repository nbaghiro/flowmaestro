import { FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../core/logging";

const logger = createServiceLogger("FormInterfaceRateLimiter");

// In-memory rate limit tracking
// Note: In production with multiple instances, use Redis
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const submissionLimits = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of submissionLimits.entries()) {
        if (entry.resetAt <= now) {
            submissionLimits.delete(key);
        }
    }
}, 60000); // Clean up every minute

/**
 * Creates a rate limiter middleware for form interface submissions
 * @param limitPerMinute Maximum submissions per minute per IP
 */
export function createFormInterfaceRateLimiter(limitPerMinute: number = 10) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const ip = request.ip;
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute window

        const entry = submissionLimits.get(ip);

        if (entry && entry.resetAt > now) {
            // Within the rate limit window
            if (entry.count >= limitPerMinute) {
                logger.warn({ ip, count: entry.count }, "Rate limit exceeded for form submission");
                return reply.status(429).send({
                    success: false,
                    error: "Too many submissions. Please try again in a minute.",
                    retryAfter: Math.ceil((entry.resetAt - now) / 1000)
                });
            }
            // Increment count
            entry.count++;
        } else {
            // New window
            submissionLimits.set(ip, {
                count: 1,
                resetAt: now + windowMs
            });
        }

        // Continue to handler
    };
}

/**
 * Default rate limiter instance (10 submissions per minute per IP)
 */
export const formInterfaceRateLimiter = createFormInterfaceRateLimiter(10);

/**
 * File upload rate limiter instance (20 uploads per minute per IP)
 * Higher limit than submissions since users may upload multiple files per submission
 */
export const formInterfaceFileUploadRateLimiter = createFormInterfaceRateLimiter(20);

/**
 * Query rate limiter instance (30 queries per minute per IP)
 * Higher limit since RAG queries may need multiple lookups during execution
 * but still limited to prevent embedding API abuse
 */
export const formInterfaceQueryRateLimiter = createFormInterfaceRateLimiter(30);
