/**
 * GET /analytics/overview
 * Returns overview analytics for the last 7 days
 */

import { FastifyInstance } from "fastify";
import { db } from "../../../storage/database";
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

            // Get aggregated stats from daily_analytics
            const statsResult = await db.query(
                `
                SELECT
                    SUM(total_executions) as total_executions,
                    SUM(successful_executions) as successful_executions,
                    SUM(failed_executions) as failed_executions,
                    SUM(total_tokens) as total_tokens,
                    SUM(total_cost) as total_cost,
                    AVG(avg_duration_ms) as avg_duration_ms
                FROM flowmaestro.daily_analytics
                WHERE user_id = $1
                AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
                `,
                [userId, days]
            );

            // Get top models by cost
            const topModelsResult = await db.query(
                `
                SELECT provider, model, SUM(total_cost) as total_cost
                FROM flowmaestro.model_usage_stats
                WHERE user_id = $1
                AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
                GROUP BY provider, model
                ORDER BY total_cost DESC
                LIMIT 5
                `,
                [userId, days]
            );

            const stats = statsResult.rows[0] as {
                total_executions: string | null;
                successful_executions: string | null;
                failed_executions: string | null;
                total_tokens: string | null;
                total_cost: string | null;
                avg_duration_ms: string | null;
            };

            const topModels = topModelsResult.rows as Array<{
                provider: string;
                model: string;
                total_cost: string;
            }>;

            return reply.send({
                success: true,
                data: {
                    period: `${days} days`,
                    totalExecutions: parseInt(stats.total_executions || "0", 10),
                    successfulExecutions: parseInt(stats.successful_executions || "0", 10),
                    failedExecutions: parseInt(stats.failed_executions || "0", 10),
                    successRate:
                        stats.total_executions && parseInt(stats.total_executions, 10) > 0
                            ? parseFloat(
                                  (
                                      (parseInt(stats.successful_executions || "0", 10) /
                                          parseInt(stats.total_executions, 10)) *
                                      100
                                  ).toFixed(2)
                              )
                            : 0,
                    totalTokens: parseInt(stats.total_tokens || "0", 10),
                    totalCost: parseFloat(stats.total_cost || "0"),
                    avgDurationMs: parseFloat(stats.avg_duration_ms || "0"),
                    topModels: topModels.map((row) => ({
                        provider: row.provider,
                        model: row.model,
                        totalCost: parseFloat(row.total_cost)
                    }))
                }
            });
        }
    );
}
