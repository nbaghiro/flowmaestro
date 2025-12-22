/**
 * Triggered Workflow
 * Wrapper workflow for executions started by triggers (schedule, webhook, event)
 */

import { proxyActivities } from "@temporalio/workflow";
import type { JsonValue, WorkflowDefinition, JsonObject } from "@flowmaestro/shared";
import { orchestratorWorkflow, OrchestratorResult } from "./orchestrator-workflow";
import type * as triggerActivities from "../activities/trigger-execution";

// Proxy activities for database operations
const { prepareTriggeredExecution, completeTriggeredExecution } = proxyActivities<
    typeof triggerActivities
>({
    startToCloseTimeout: "30 seconds",
    retry: {
        maximumAttempts: 3
    }
});

export interface TriggeredWorkflowInput {
    triggerId: string;
    workflowId: string;
    payload?: Record<string, JsonValue>;
}

export interface TriggeredWorkflowResult {
    success: boolean;
    executionId: string;
    outputs?: Record<string, JsonValue>;
    error?: string;
}

/**
 * Main triggered workflow
 * Handles workflow execution initiated by triggers
 */
export async function triggeredWorkflow(
    input: TriggeredWorkflowInput
): Promise<TriggeredWorkflowResult> {
    const { triggerId, workflowId, payload = {} } = input;

    console.log(`[TriggeredWorkflow] Starting for trigger ${triggerId}, workflow ${workflowId}`);

    try {
        // Step 1: Prepare execution (fetch workflow, create execution record, link to trigger)
        const preparation = await prepareTriggeredExecution({
            triggerId,
            workflowId,
            payload
        });

        console.log(`[TriggeredWorkflow] Prepared execution ${preparation.executionId}`);

        // Step 2: Execute the workflow using orchestrator
        let orchestratorResult: OrchestratorResult;
        try {
            orchestratorResult = await orchestratorWorkflow({
                executionId: preparation.executionId,
                workflowDefinition: preparation.workflowDefinition as WorkflowDefinition,
                inputs: preparation.inputs as JsonObject
            });
        } catch (error) {
            // Handle orchestrator failure
            console.error("[TriggeredWorkflow] Orchestrator failed:", error);

            await completeTriggeredExecution(
                preparation.executionId,
                false,
                undefined,
                `Orchestrator error: ${error}`
            );

            return {
                success: false,
                executionId: preparation.executionId,
                error: `Workflow execution failed: ${error}`
            };
        }

        // Step 3: Complete execution with results
        await completeTriggeredExecution(
            preparation.executionId,
            orchestratorResult.success,
            orchestratorResult.outputs,
            orchestratorResult.error
        );

        console.log(`[TriggeredWorkflow] Completed execution ${preparation.executionId}`);

        return {
            success: orchestratorResult.success,
            executionId: preparation.executionId,
            outputs: orchestratorResult.outputs,
            error: orchestratorResult.error
        };
    } catch (error) {
        console.error("[TriggeredWorkflow] Fatal error:", error);
        return {
            success: false,
            executionId: "",
            error: `Fatal error in triggered workflow: ${error}`
        };
    }
}
