/**
 * Scheduled Workflow Executor Task
 *
 * This task is triggered by Trigger.dev schedules and executes workflows
 * based on their trigger configuration.
 */

import { schedules, metadata } from "@trigger.dev/sdk/v3";
import type { JsonObject } from "@flowmaestro/shared";
import { TriggerRepository } from "../../storage/repositories/TriggerRepository";
import { WorkflowRepository } from "../../storage/repositories/WorkflowRepository";
import { workflowExecutor } from "./workflow-executor";
import { createServiceLogger } from "../../core/logging";

const logger = createServiceLogger("ScheduledWorkflowExecutor");

/**
 * Scheduled Workflow Executor
 *
 * Handles scheduled workflow triggers. When a schedule fires, this task:
 * 1. Looks up the trigger by its external ID
 * 2. Loads the associated workflow
 * 3. Executes the workflow via the workflowExecutor task
 */
export const scheduledWorkflowExecutor = schedules.task({
    id: "scheduled-workflow-executor",
    run: async (payload) => {
        const { externalId, timestamp } = payload;

        if (!externalId) {
            logger.error("No externalId provided in scheduled payload");
            return { success: false, error: "No externalId provided" };
        }

        // Extract trigger ID from external ID (format: "trigger-{triggerId}")
        const triggerId = externalId.replace("trigger-", "");

        await metadata.set("triggerId", triggerId);
        await metadata.set("scheduledTime", timestamp.toISOString());

        try {
            const triggerRepo = new TriggerRepository();
            const workflowRepo = new WorkflowRepository();

            // Load the trigger
            const trigger = await triggerRepo.findById(triggerId);

            if (!trigger) {
                logger.warn({ triggerId }, "Trigger not found for scheduled execution");
                return { success: false, error: "Trigger not found" };
            }

            if (!trigger.enabled) {
                logger.info({ triggerId }, "Trigger is disabled, skipping execution");
                return { success: false, error: "Trigger is disabled" };
            }

            await metadata.set("workflowId", trigger.workflow_id);

            // Load the workflow
            const workflow = await workflowRepo.findById(trigger.workflow_id);

            if (!workflow) {
                logger.warn(
                    { triggerId, workflowId: trigger.workflow_id },
                    "Workflow not found for scheduled trigger"
                );
                return { success: false, error: "Workflow not found" };
            }

            // Generate execution ID
            const executionId = `sched-${triggerId}-${Date.now()}`;

            await metadata.set("executionId", executionId);

            // Get inputs from trigger config if available (for manual triggers with preset inputs)
            const triggerConfig = trigger.config as Record<string, unknown>;
            const inputs = (triggerConfig.inputs || {}) as JsonObject;

            // Execute the workflow
            const result = await workflowExecutor.triggerAndWait({
                executionId,
                workflowId: workflow.id,
                userId: workflow.user_id,
                definition: workflow.definition,
                inputs,
                triggerType: "schedule",
                meta: {
                    triggerId,
                    scheduledTime: timestamp.toISOString()
                }
            });

            // Update trigger's last run time
            await triggerRepo.update(triggerId, {
                last_triggered_at: new Date()
            });

            if (result.ok) {
                logger.info(
                    {
                        triggerId,
                        workflowId: workflow.id,
                        executionId,
                        success: result.output.success
                    },
                    "Scheduled workflow execution completed"
                );

                return {
                    success: result.output.success,
                    executionId,
                    outputs: result.output.outputs
                };
            } else {
                logger.error(
                    { triggerId, workflowId: workflow.id, executionId, error: result.error },
                    "Scheduled workflow execution failed"
                );

                return {
                    success: false,
                    executionId,
                    error: "Workflow execution failed"
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error(
                { triggerId, error: errorMessage },
                "Scheduled workflow execution failed"
            );

            return {
                success: false,
                error: errorMessage
            };
        }
    }
});
