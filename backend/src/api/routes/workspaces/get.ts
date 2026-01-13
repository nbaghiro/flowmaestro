import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { workspaceService } from "../../../services/workspace";
import { authMiddleware, workspaceContextMiddleware } from "../../middleware";

const logger = createServiceLogger("WorkspaceRoutes");

export async function getWorkspaceRoute(fastify: FastifyInstance) {
    fastify.get<{
        Params: { workspaceId: string };
    }>(
        "/:workspaceId",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const { workspaceId } = request.params;

            try {
                const workspace = await workspaceService.getWorkspaceWithStats(workspaceId);

                if (!workspace) {
                    return reply.status(404).send({
                        success: false,
                        error: "Workspace not found"
                    });
                }

                return reply.send({
                    success: true,
                    data: {
                        workspace,
                        role: request.workspace!.role,
                        isOwner: request.workspace!.isOwner
                    }
                });
            } catch (error) {
                logger.error({ workspaceId, error }, "Error getting workspace");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
