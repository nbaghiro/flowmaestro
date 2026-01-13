import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

const logger = createServiceLogger("FormInterfaceRoutes");

export async function publishFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/publish",
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

                // Check if already published
                if (existing.status === "published") {
                    return reply.send({
                        success: true,
                        data: existing,
                        message: "Form interface is already published"
                    });
                }

                // Validate that target is set
                if (!existing.workflowId && !existing.agentId) {
                    return reply.status(400).send({
                        success: false,
                        error: "Cannot publish form interface without a linked workflow or agent"
                    });
                }

                const formInterface = await formInterfaceRepo.publishByWorkspaceId(id, workspaceId);

                if (!formInterface) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to publish form interface"
                    });
                }

                logger.info({ formInterfaceId: id, workspaceId }, "Form interface published");

                return reply.send({
                    success: true,
                    data: formInterface
                });
            } catch (error) {
                logger.error({ id, workspaceId, error }, "Error publishing form interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
