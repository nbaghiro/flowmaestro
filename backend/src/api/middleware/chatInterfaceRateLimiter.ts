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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const chatInterfaceRateLimiter = async (request: FastifyRequest, _reply: FastifyReply) => {
    // Rate limiting is handled in the route handler after fetching the interface
    // This middleware is kept for potential future use (e.g., IP-based rate limiting)
    const body = request.body as { sessionToken?: string };

    // If no session token, skip - validation happens in the route handler
    if (!body?.sessionToken) return;

    // The route handler calls checkChatRateLimit after loading the interface config
    return;
};
