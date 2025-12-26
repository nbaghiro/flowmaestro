/**
 * GET /analytics/daily
 * Returns daily analytics time-series data from Cloud Monitoring
 */

import { FastifyInstance } from "fastify";
import { getDailyAnalytics } from "../../../core/observability";
import { authMiddleware } from "../../middleware/auth";

export async function getDailyAnalyticsRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get(
        "/analytics/daily",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user!.id;
            const query = request.query as {
                days?: string;
            };
            const days = parseInt(query.days || "30", 10);

            // Query Cloud Monitoring for daily analytics
            const dailyData = await getDailyAnalytics(userId, days);

            return reply.send({
                success: true,
                data: dailyData.map((d) => ({
                    date: d.date,
                    totalExecutions: d.executions,
                    successfulExecutions: d.successfulExecutions,
                    failedExecutions: d.failedExecutions,
                    successRate:
                        d.executions > 0
                            ? Math.round((d.successfulExecutions / d.executions) * 10000) / 100
                            : 0,
                    totalTokens: d.tokens,
                    totalCost: d.cost
                }))
            });
        }
    );
}
