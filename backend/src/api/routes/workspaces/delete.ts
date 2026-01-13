import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { workspaceService } from "../../../services/workspace";
import { authMiddleware, workspaceContextMiddleware, requireOwner } from "../../middleware";

const logger = createServiceLogger("WorkspaceRoutes");

export async function deleteWorkspaceRoute(fastify: FastifyInstance) {
    fastify.delete<{
        Params: { workspaceId: string };
    }>(
        "/:workspaceId",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware, requireOwner]
        },
        async (request, reply) => {
            const { workspaceId } = request.params;
            const userId = request.user!.id;

            try {
                const success = await workspaceService.deleteWorkspace(workspaceId);

                if (!success) {
                    return reply.status(404).send({
                        success: false,
                        error: "Workspace not found"
                    });
                }

                logger.info({ workspaceId, userId }, "Workspace deleted");

                return reply.send({
                    success: true,
                    message: "Workspace deleted successfully"
                });
            } catch (error) {
                logger.error({ workspaceId, userId, error }, "Error deleting workspace");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
