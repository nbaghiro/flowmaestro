import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { creditService } from "../../../../services/workspace";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../../middleware";

const logger = createServiceLogger("WorkspaceCreditRoutes");

export async function getCreditsBalanceRoute(fastify: FastifyInstance) {
    fastify.get<{
        Params: { workspaceId: string };
    }>(
        "/:workspaceId/credits/balance",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware, requirePermission("view")]
        },
        async (request, reply) => {
            const { workspaceId } = request.params;

            try {
                const balance = await creditService.getBalance(workspaceId);

                if (!balance) {
                    return reply.status(404).send({
                        success: false,
                        error: "Credits not found for this workspace"
                    });
                }

                return reply.send({
                    success: true,
                    data: balance
                });
            } catch (error) {
                logger.error({ workspaceId, error }, "Error getting credit balance");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
