/**
 * Trigger Execution Activity
 * Handles workflow executions initiated by triggers
 */

import type { JsonValue } from "@flowmaestro/shared";
import { ExecutionRepository } from "../../storage/repositories/ExecutionRepository";
import { TriggerRepository } from "../../storage/repositories/TriggerRepository";
import { WorkflowRepository } from "../../storage/repositories/WorkflowRepository";
import { createActivityLogger } from "../shared/logger";

const logger = createActivityLogger({ component: "TriggerExecution" });

export interface TriggerExecutionInput {
    triggerId: string;
    workflowId: string;
    payload?: Record<string, JsonValue>;
}

export interface TriggerExecutionResult {
    executionId: string;
    workflowDefinition: unknown;
    inputs: Record<string, JsonValue>;
}

/**
 * Prepare workflow for execution triggered by a schedule/webhook/event
 * This activity:
 * 1. Fetches workflow from database
 * 2. Creates execution record
 * 3. Links execution to trigger
 * 4. Returns workflow definition for orchestrator
 */
export async function prepareTriggeredExecution(
    input: TriggerExecutionInput
): Promise<TriggerExecutionResult> {
    const { triggerId, workflowId, payload = {} } = input;

    const workflowRepo = new WorkflowRepository();
    const triggerRepo = new TriggerRepository();
    const executionRepo = new ExecutionRepository();

    try {
        // Fetch workflow definition
        const workflow = await workflowRepo.findById(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        // Verify trigger exists
        const trigger = await triggerRepo.findById(triggerId);
        if (!trigger) {
            throw new Error(`Trigger not found: ${triggerId}`);
        }

        // Create execution record
        // Cast payload to ensure it's compatible with JsonValue
        const jsonPayload = payload as Record<string, JsonValue>;

        const execution = await executionRepo.create({
            workflow_id: workflowId,
            inputs: jsonPayload
        });

        // Update execution with trigger info and set to running
        await executionRepo.update(execution.id, {
            status: "running",
            current_state: {
                startedBy: "trigger",
                triggerId: triggerId,
                triggerType: trigger.trigger_type,
                triggerName: trigger.name
            } as Record<string, JsonValue>,
            started_at: new Date()
        });

        const executionId = execution.id;

        // Link execution to trigger
        await triggerRepo.createExecution({
            trigger_id: triggerId,
            execution_id: executionId,
            trigger_payload: jsonPayload
        });

        // Record trigger fired
        await triggerRepo.recordTrigger(triggerId);

        logger.info("Prepared triggered execution", {
            executionId,
            workflowId,
            triggerId,
            triggerType: trigger.trigger_type,
            triggerName: trigger.name
        });

        return {
            executionId,
            workflowDefinition: workflow.definition,
            inputs: jsonPayload
        };
    } catch (error) {
        logger.error(
            "Failed to prepare triggered execution",
            error instanceof Error ? error : new Error(String(error)),
            { triggerId, workflowId }
        );
        throw error;
    }
}

/**
 * Complete a triggered execution
 * Updates execution and trigger records
 */
export async function completeTriggeredExecution(
    executionId: string,
    success: boolean,
    outputs?: Record<string, JsonValue>,
    error?: string
): Promise<void> {
    const executionRepo = new ExecutionRepository();

    try {
        await executionRepo.update(executionId, {
            status: success ? "completed" : "failed",
            outputs: outputs ? (outputs as Record<string, JsonValue>) : undefined,
            error: error || undefined,
            completed_at: new Date()
        });

        logger.info("Completed triggered execution", {
            executionId,
            success,
            hasOutputs: !!outputs,
            hasError: !!error
        });
    } catch (err) {
        logger.error(
            "Failed to complete triggered execution",
            err instanceof Error ? err : new Error(String(err)),
            { executionId, success }
        );
        throw err;
    }
}
