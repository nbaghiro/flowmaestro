import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

const logger = createServiceLogger("FormInterfaceRoutes");

export async function unpublishFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/unpublish",
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

                // Check if already draft
                if (existing.status === "draft") {
                    return reply.send({
                        success: true,
                        data: existing,
                        message: "Form interface is already unpublished"
                    });
                }

                const formInterface = await formInterfaceRepo.unpublishByWorkspaceId(
                    id,
                    workspaceId
                );

                if (!formInterface) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to unpublish form interface"
                    });
                }

                // Cleanup auto-created trigger if it exists
                if (existing.triggerId) {
                    const triggerRepo = new TriggerRepository();
                    const trigger = await triggerRepo.findById(existing.triggerId);

                    // Only delete if it's an auto-created trigger (has special naming convention)
                    if (trigger && trigger.name.startsWith("__form_interface_")) {
                        await triggerRepo.delete(existing.triggerId);
                        await formInterfaceRepo.setTriggerId(id, null);
                        logger.info(
                            { formInterfaceId: id, triggerId: existing.triggerId },
                            "Deleted auto-created trigger on unpublish"
                        );
                    }
                }

                logger.info({ formInterfaceId: id, workspaceId }, "Form interface unpublished");

                return reply.send({
                    success: true,
                    data: formInterface
                });
            } catch (error) {
                logger.error({ id, workspaceId, error }, "Error unpublishing form interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
