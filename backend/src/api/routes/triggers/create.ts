import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { TriggerType, ScheduleTriggerConfig } from "../../../storage/models/Trigger";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import { SchedulerService } from "../../../temporal/core/services/scheduler";
import { NotFoundError } from "../../middleware/error-handler";

const logger = createServiceLogger("TriggerRoutes");

export async function createTriggerRoute(fastify: FastifyInstance) {
    fastify.post("/", async (request, reply) => {
        const triggerRepo = new TriggerRepository();
        const workflowRepo = new WorkflowRepository();
        const workspaceId = request.workspace!.id;
        const body = request.body as {
            workflowId: string;
            name: string;
            triggerType: string;
            config: Record<string, unknown>;
            enabled?: boolean;
        };

        try {
            // Verify the workflow belongs to this workspace
            const workflow = await workflowRepo.findByIdAndWorkspaceId(
                body.workflowId,
                workspaceId
            );
            if (!workflow) {
                throw new NotFoundError("Workflow not found");
            }

            // Create trigger in database
            const trigger = await triggerRepo.create({
                workflow_id: body.workflowId,
                name: body.name,
                trigger_type: body.triggerType as TriggerType,
                config: body.config,
                enabled: body.enabled !== undefined ? body.enabled : true
            });

            // If it's a schedule trigger, register with Temporal
            if (trigger.trigger_type === "schedule") {
                const schedulerService = new SchedulerService();
                await schedulerService.createScheduledTrigger(
                    trigger.id,
                    trigger.workflow_id,
                    trigger.config as ScheduleTriggerConfig
                );
            }

            return reply.status(201).send({
                success: true,
                data: trigger
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            logger.error(
                { workflowId: body.workflowId, triggerType: body.triggerType, error },
                "Error creating trigger"
            );
            return reply.status(500).send({
                success: false,
                error: String(error)
            });
        }
    });
}
