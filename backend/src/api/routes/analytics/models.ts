/**
 * GET /analytics/models
 * Returns model usage statistics
 */

import { FastifyInstance } from "fastify";
import { db } from "../../../storage/database";
import { authMiddleware } from "../../middleware/auth";

export async function getModelAnalyticsRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get(
        "/analytics/models",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user!.id;
            const query = request.query as { days?: string; provider?: string };
            const days = parseInt(query.days || "30", 10);
            const { provider } = query;

            let queryText = `
                SELECT
                    provider,
                    model,
                    SUM(total_calls) as total_calls,
                    SUM(successful_calls) as successful_calls,
                    SUM(failed_calls) as failed_calls,
                    SUM(total_tokens) as total_tokens,
                    SUM(total_cost) as total_cost,
                    AVG(avg_cost_per_call) as avg_cost_per_call,
                    AVG(avg_duration_ms) as avg_duration_ms
                FROM flowmaestro.model_usage_stats
                WHERE user_id = $1
                AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
            `;

            const params: unknown[] = [userId, days];

            if (provider) {
                params.push(provider);
                queryText += ` AND provider = $${params.length}`;
            }

            queryText += `
                GROUP BY provider, model
                ORDER BY total_cost DESC
            `;

            const result = await db.query(queryText, params);

            interface ModelUsageRow {
                provider: string;
                model: string;
                total_calls: string;
                successful_calls: string;
                failed_calls: string;
                total_tokens: string;
                total_cost: string;
                avg_cost_per_call: string | null;
                avg_duration_ms: string | null;
            }

            const rows = result.rows as ModelUsageRow[];

            return reply.send({
                success: true,
                data: rows.map((row) => ({
                    provider: row.provider,
                    model: row.model,
                    totalCalls: parseInt(row.total_calls, 10),
                    successfulCalls: parseInt(row.successful_calls, 10),
                    failedCalls: parseInt(row.failed_calls, 10),
                    totalTokens: parseInt(row.total_tokens, 10),
                    totalCost: parseFloat(row.total_cost),
                    avgCostPerCall: parseFloat(row.avg_cost_per_call || "0"),
                    avgDurationMs: parseFloat(row.avg_duration_ms || "0")
                }))
            });
        }
    );
}
