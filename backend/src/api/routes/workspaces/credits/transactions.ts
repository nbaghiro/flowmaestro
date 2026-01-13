import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { creditService } from "../../../../services/workspace";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../../middleware";

const logger = createServiceLogger("WorkspaceCreditRoutes");

export async function getCreditsTransactionsRoute(fastify: FastifyInstance) {
    fastify.get<{
        Params: { workspaceId: string };
        Querystring: { limit?: number; offset?: number };
    }>(
        "/:workspaceId/credits/transactions",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware, requirePermission("view")]
        },
        async (request, reply) => {
            const { workspaceId } = request.params;
            const { limit = 50, offset = 0 } = request.query;

            try {
                const transactions = await creditService.getTransactions(workspaceId, {
                    limit: Math.min(limit, 100),
                    offset
                });

                return reply.send({
                    success: true,
                    data: transactions
                });
            } catch (error) {
                logger.error({ workspaceId, error }, "Error getting credit transactions");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
