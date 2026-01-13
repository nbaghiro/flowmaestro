import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

const logger = createServiceLogger("FormInterfaceRoutes");

export async function deleteFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const formInterfaceRepo = new FormInterfaceRepository();
            const { id } = request.params as { id: string };
            const workspaceId = request.workspace!.id;

            try {
                // Check if form interface exists
                const existing = await formInterfaceRepo.findByIdAndWorkspaceId(id, workspaceId);
                if (!existing) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
                    });
                }

                const deleted = await formInterfaceRepo.softDeleteByWorkspaceId(id, workspaceId);

                if (!deleted) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to delete form interface"
                    });
                }

                logger.info({ formInterfaceId: id, workspaceId }, "Form interface deleted");

                return reply.send({
                    success: true,
                    message: "Form interface deleted successfully"
                });
            } catch (error) {
                logger.error({ id, workspaceId, error }, "Error deleting form interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
