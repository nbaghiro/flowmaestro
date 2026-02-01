import { FastifyRequest, FastifyReply } from "fastify";
import { redis } from "../../services/redis";

export async function checkChatRateLimit(
    interfaceId: string,
    sessionToken: string,
    limit: number = 10,
    windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const key = `chat-rate:${interfaceId}:${sessionToken}`;

    // Cleanup first
    await redis.zremrangebyscore(key, 0, now - windowMs);

    // Get current count
    const count = await redis.zcard(key);

    if (count >= limit) {
        // Calculate reset time (timestamp of oldest request + window)
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

/**
 * IP-based rate limiter for chat interface endpoints.
 * This provides a first line of defense against abuse before session-specific limits.
 * Uses a higher limit (100 req/min per IP) as a baseline protection.
 */
export const chatInterfaceRateLimiter = async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip || "unknown";
    const limit = 100; // 100 requests per minute per IP
    const windowSeconds = 60;

    const result = await checkIpRateLimit(ip, limit, windowSeconds);

    if (!result.allowed) {
        return reply.status(429).send({
            success: false,
            error: "Too many requests. Please slow down.",
            resetAt: result.resetAt
        });
    }

    // Allowed - continue to route handler which may apply session-specific limits
    return;
};

/**
 * IP-based rate limiting using Redis sliding window
 */
async function checkIpRateLimit(
    ip: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const key = `chat-ip-rate:${ip}`;

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
