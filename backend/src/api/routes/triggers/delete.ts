import { FastifyInstance } from "fastify";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { SchedulerService } from "../../../temporal/core/services/scheduler";
import { NotFoundError } from "../../middleware/error-handler";

export async function deleteTriggerRoute(fastify: FastifyInstance) {
    fastify.delete("/:id", async (request, reply) => {
        const triggerRepo = new TriggerRepository();
        const workspaceId = request.workspace!.id;
        const { id } = request.params as { id: string };

        fastify.log.info(`Attempting to delete trigger: ${id}`);

        try {
            const trigger = await triggerRepo.findByIdAndWorkspaceId(id, workspaceId);
            if (!trigger) {
                fastify.log.warn(`Trigger not found: ${id}`);
                throw new NotFoundError("Trigger not found");
            }

            fastify.log.info(`Found trigger: ${trigger.id}, type: ${trigger.trigger_type}`);

            // If it's a schedule trigger, delete from Temporal
            if (trigger.trigger_type === "schedule") {
                fastify.log.info(`Deleting scheduled trigger from Temporal: ${id}`);
                try {
                    const schedulerService = new SchedulerService();
                    await schedulerService.deleteScheduledTrigger(id);
                    fastify.log.info(`Successfully deleted schedule from Temporal: ${id}`);
                } catch (scheduleError) {
                    // Log but continue with database deletion
                    fastify.log.error(
                        scheduleError as Error,
                        "Failed to delete Temporal schedule, continuing with DB deletion"
                    );
                }
            }

            // Soft delete trigger
            const deleted = await triggerRepo.delete(id);
            if (!deleted) {
                fastify.log.error(`Failed to delete trigger from database: ${id}`);
                return reply.status(500).send({
                    success: false,
                    error: "Failed to delete trigger"
                });
            }

            fastify.log.info(`Successfully deleted trigger: ${id}`);
            return reply.send({
                success: true,
                message: "Trigger deleted"
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            fastify.log.error(error as Error, "Error deleting trigger");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
