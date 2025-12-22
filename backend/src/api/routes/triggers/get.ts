import { FastifyInstance } from "fastify";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { SchedulerService } from "../../../temporal/services/SchedulerService";
import { authMiddleware } from "../../middleware";

export async function getTriggerRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const triggerRepo = new TriggerRepository();
            const { id } = request.params as { id: string };

            try {
                const trigger = await triggerRepo.findById(id);

                if (!trigger) {
                    return reply.status(404).send({
                        success: false,
                        error: "Trigger not found"
                    });
                }

                // If it's a schedule trigger, get Temporal schedule info
                let scheduleInfo = null;
                if (trigger.trigger_type === "schedule" && trigger.temporal_schedule_id) {
                    try {
                        const schedulerService = new SchedulerService();
                        scheduleInfo = await schedulerService.getScheduleInfo(id);
                    } catch (error) {
                        console.error("Error fetching schedule info:", error);
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
                console.error("Error getting trigger:", error);
                return reply.status(500).send({
                    success: false,
                    error: String(error)
                });
            }
        }
    );
}
