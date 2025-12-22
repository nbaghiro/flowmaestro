import { FastifyInstance } from "fastify";
import { ScheduleTriggerConfig } from "../../../storage/models/Trigger";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { SchedulerService } from "../../../temporal/services/SchedulerService";
import { authMiddleware } from "../../middleware";

export async function updateTriggerRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const triggerRepo = new TriggerRepository();
            const { id } = request.params as { id: string };
            const body = request.body as {
                name?: string;
                config?: Record<string, unknown>;
                enabled?: boolean;
            };

            try {
                const existing = await triggerRepo.findById(id);
                if (!existing) {
                    return reply.status(404).send({
                        success: false,
                        error: "Trigger not found"
                    });
                }

                // Update trigger in database
                const trigger = await triggerRepo.update(id, {
                    name: body.name,
                    config: body.config,
                    enabled: body.enabled
                });

                // If it's a schedule trigger and config/enabled changed, update Temporal schedule
                if (trigger && trigger.trigger_type === "schedule") {
                    const schedulerService = new SchedulerService();

                    if (body.config) {
                        await schedulerService.updateScheduledTrigger(
                            id,
                            body.config as unknown as ScheduleTriggerConfig
                        );
                    } else if (body.enabled !== undefined) {
                        if (body.enabled) {
                            await schedulerService.resumeScheduledTrigger(id);
                        } else {
                            await schedulerService.pauseScheduledTrigger(id);
                        }
                    }
                }

                return reply.send({
                    success: true,
                    data: trigger
                });
            } catch (error) {
                console.error("Error updating trigger:", error);
                return reply.status(500).send({
                    success: false,
                    error: String(error)
                });
            }
        }
    );
}
