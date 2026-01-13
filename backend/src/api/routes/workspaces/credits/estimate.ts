import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { creditService } from "../../../../services/workspace";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../../middleware";

const logger = createServiceLogger("WorkspaceCreditRoutes");

interface EstimateRequestBody {
    workflowDefinition: {
        nodes: Array<{ id: string; type: string; data?: Record<string, unknown> }>;
    };
}

export async function estimateCreditsRoute(fastify: FastifyInstance) {
    fastify.post<{
        Params: { workspaceId: string };
        Body: EstimateRequestBody;
    }>(
        "/:workspaceId/credits/estimate",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware, requirePermission("view")]
        },
        async (request, reply) => {
            const { workspaceId } = request.params;
            const { workflowDefinition } = request.body;

            try {
                if (
                    !workflowDefinition ||
                    !workflowDefinition.nodes ||
                    !Array.isArray(workflowDefinition.nodes)
                ) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid workflow definition. Must include nodes array."
                    });
                }

                const estimate = await creditService.estimateWorkflowCredits(workflowDefinition);

                // Also get current balance for context
                const balance = await creditService.getBalance(workspaceId);

                return reply.send({
                    success: true,
                    data: {
                        estimate,
                        currentBalance: balance?.available || 0,
                        hasEnoughCredits: (balance?.available || 0) >= estimate.totalCredits
                    }
                });
            } catch (error) {
                logger.error({ workspaceId, error }, "Error estimating credits");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
