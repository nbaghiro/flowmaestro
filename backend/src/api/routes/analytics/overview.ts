/**
 * GET /analytics/overview
 * Returns overview analytics from Cloud Monitoring for the last N days
 */

import { FastifyInstance } from "fastify";
import { getAnalyticsOverview, getModelUsageStats } from "../../../core/observability";
import { authMiddleware } from "../../middleware/auth";

export async function getAnalyticsOverviewRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get(
        "/analytics/overview",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user!.id;
            const query = request.query as { days?: string };
            const days = parseInt(query.days || "7", 10);

            // Query Cloud Monitoring for analytics
            const [overview, topModels] = await Promise.all([
                getAnalyticsOverview(userId, days),
                getModelUsageStats(userId, days, 5)
            ]);

            return reply.send({
                success: true,
                data: {
                    period: `${days} days`,
                    totalExecutions: overview.totalExecutions,
                    successfulExecutions: overview.successfulExecutions,
                    failedExecutions: overview.failedExecutions,
                    successRate: overview.successRate,
                    totalTokens: overview.totalTokens,
                    totalCost: overview.totalCost,
                    avgDurationMs: overview.avgDurationMs,
                    topModels: topModels.map((m) => ({
                        provider: m.provider,
                        model: m.model,
                        requests: m.requests,
                        totalCost: m.cost
                    }))
                }
            });
        }
    );
}
