/**
 * GET /analytics/daily
 * Returns daily analytics time-series data
 */

import { FastifyInstance } from "fastify";
import { db } from "../../../storage/database";
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
                entityType?: string;
                entityId?: string;
            };
            const days = parseInt(query.days || "30", 10);
            const { entityType, entityId } = query;

            let queryText = `
                SELECT
                    date,
                    entity_type,
                    entity_id,
                    total_executions,
                    successful_executions,
                    failed_executions,
                    total_tokens,
                    total_cost,
                    avg_duration_ms
                FROM flowmaestro.daily_analytics
                WHERE user_id = $1
                AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
            `;

            const params: unknown[] = [userId, days];

            if (entityType) {
                params.push(entityType);
                queryText += ` AND entity_type = $${params.length}`;
            }

            if (entityId) {
                params.push(entityId);
                queryText += ` AND entity_id = $${params.length}`;
            }

            queryText += " ORDER BY date DESC";

            const result = await db.query(queryText, params);

            interface DailyAnalyticsRow {
                date: string;
                entity_type: string;
                entity_id: string;
                total_executions: string;
                successful_executions: string;
                failed_executions: string;
                total_tokens: string;
                total_cost: string;
                avg_duration_ms: string | null;
            }

            const rows = result.rows as DailyAnalyticsRow[];

            return reply.send({
                success: true,
                data: rows.map((row) => ({
                    date: row.date,
                    entityType: row.entity_type,
                    entityId: row.entity_id,
                    totalExecutions: parseInt(row.total_executions, 10),
                    successfulExecutions: parseInt(row.successful_executions, 10),
                    failedExecutions: parseInt(row.failed_executions, 10),
                    totalTokens: parseInt(row.total_tokens, 10),
                    totalCost: parseFloat(row.total_cost),
                    avgDurationMs: parseFloat(row.avg_duration_ms || "0")
                }))
            });
        }
    );
}
