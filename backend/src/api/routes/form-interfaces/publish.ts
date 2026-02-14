import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
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
            const triggerRepo = new TriggerRepository();
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

                // Auto-create hidden manual trigger for workflows (if needed)
                if (
                    existing.targetType === "workflow" &&
                    existing.workflowId &&
                    !existing.triggerId
                ) {
                    try {
                        const trigger = await triggerRepo.create({
                            workflow_id: existing.workflowId,
                            name: `__form_interface_${id}__`,
                            trigger_type: "manual",
                            config: { description: "Auto-created for form interface" },
                            enabled: true
                        });

                        // Set trigger ID on form interface
                        await formInterfaceRepo.setTriggerId(id, trigger.id);

                        logger.info(
                            { formInterfaceId: id, triggerId: trigger.id, workspaceId },
                            "Auto-created trigger for form interface"
                        );
                    } catch (triggerError) {
                        logger.error(
                            { formInterfaceId: id, workspaceId, error: triggerError },
                            "Failed to auto-create trigger for form interface"
                        );
                        // Continue with publish - trigger can be created manually if needed
                    }
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
