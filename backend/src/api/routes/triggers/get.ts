import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { SchedulerService } from "../../../temporal/core/services/scheduler";
import { NotFoundError } from "../../middleware/error-handler";

const logger = createServiceLogger("TriggerRoutes");

export async function getTriggerRoute(fastify: FastifyInstance) {
    fastify.get("/:id", async (request, reply) => {
        const triggerRepo = new TriggerRepository();
        const workspaceId = request.workspace!.id;
        const { id } = request.params as { id: string };

        try {
            const trigger = await triggerRepo.findByIdAndWorkspaceId(id, workspaceId);

            if (!trigger) {
                throw new NotFoundError("Trigger not found");
            }

            // If it's a schedule trigger, get Temporal schedule info
            let scheduleInfo = null;
            if (trigger.trigger_type === "schedule" && trigger.temporal_schedule_id) {
                try {
                    const schedulerService = new SchedulerService();
                    scheduleInfo = await schedulerService.getScheduleInfo(id);
                } catch (error) {
                    logger.error({ triggerId: id, error }, "Error fetching schedule info");
                }
            }

            return reply.send({
                success: true,
                data: {
                    ...trigger,
                    scheduleInfo
                }
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error({ triggerId: id, error }, "Error getting trigger");
            return reply.status(500).send({
                success: false,
                error: String(error)
            });
        }
    });
}
