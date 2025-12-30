import type { FastifyReply, FastifyRequest } from "fastify";

type RateLimiterEntry = {
    count: number;
    resetAt: number;
};

const submissionLimits = new Map<string, RateLimiterEntry>();

export function createInterfaceRateLimiter(limitPerMinute = 10) {
    return async function createInterfaceRateLimiter(request: FastifyRequest, reply: FastifyReply) {
        const ip = request.ip;
        const now = Date.now();
        const windowMs = 60_000;

        const existing = submissionLimits.get(ip);

        if (existing && existing.resetAt > now) {
            if (existing.count >= limitPerMinute) {
                return reply.status(429).send({
                    success: false,
                    error: "Too many submission. Please try again in a minute."
                });
            }

            existing.count += 1;
            return;
        }

        submissionLimits.set(ip, {
            count: 1,
            resetAt: now + windowMs
        });
    };
}
