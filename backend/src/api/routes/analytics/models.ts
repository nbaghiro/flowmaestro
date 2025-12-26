/**
 * GET /analytics/models
 * Returns model usage statistics from Cloud Monitoring
 */

import { FastifyInstance } from "fastify";
import { getModelUsageStats } from "../../../core/observability";
import { authMiddleware } from "../../middleware/auth";

export async function getModelAnalyticsRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get(
        "/analytics/models",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user!.id;
            const query = request.query as { days?: string; limit?: string };
            const days = parseInt(query.days || "30", 10);
            const limit = parseInt(query.limit || "20", 10);

            // Query Cloud Monitoring for model usage stats
            const modelStats = await getModelUsageStats(userId, days, limit);

            return reply.send({
                success: true,
                data: modelStats.map((m) => ({
                    provider: m.provider,
                    model: m.model,
                    totalCalls: m.requests,
                    totalTokens: m.tokens,
                    totalCost: m.cost
                }))
            });
        }
    );
}
