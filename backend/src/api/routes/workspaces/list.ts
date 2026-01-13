import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { workspaceService } from "../../../services/workspace";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("WorkspaceRoutes");

export async function listWorkspacesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user!.id;

            try {
                const workspaces = await workspaceService.getWorkspacesForUser(userId);

                return reply.send({
                    success: true,
                    data: workspaces
                });
            } catch (error) {
                logger.error({ userId, error }, "Error listing workspaces");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
