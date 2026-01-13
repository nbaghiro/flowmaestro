import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

const logger = createServiceLogger("FormInterfaceRoutes");

export async function duplicateFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/duplicate",
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

                const duplicated = await formInterfaceRepo.duplicateByWorkspaceId(id, workspaceId);

                if (!duplicated) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to duplicate form interface"
                    });
                }

                logger.info(
                    { originalId: id, newId: duplicated.id, workspaceId },
                    "Form interface duplicated"
                );

                return reply.status(201).send({
                    success: true,
                    data: duplicated
                });
            } catch (error) {
                logger.error({ id, workspaceId, error }, "Error duplicating form interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
