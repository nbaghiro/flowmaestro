/**
 * Triggered Workflow
 *
 * Wrapper workflow for executions started by triggers (schedule, webhook, event).
 * Handles workflow execution initiated by triggers.
 */

import { proxyActivities } from "@temporalio/workflow";
import type { JsonValue, WorkflowDefinition, JsonObject } from "@flowmaestro/shared";
import { createWorkflowLogger } from "../core/workflow-logger";
import { orchestratorWorkflow, OrchestratorResult } from "./workflow-orchestrator";
import type * as triggerActivities from "../activities/triggers";

// ============================================================================
// ACTIVITY PROXIES
// ============================================================================

const { prepareTriggeredExecution, completeTriggeredExecution } = proxyActivities<
    typeof triggerActivities
>({
    startToCloseTimeout: "30 seconds",
    retry: {
        maximumAttempts: 3
    }
});

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// WORKFLOW
// ============================================================================

/**
 * Triggered Workflow
 *
 * Wrapper workflow for executions started by triggers (schedule, webhook, event).
 * Handles workflow execution initiated by triggers.
 */
export async function triggeredWorkflow(
    input: TriggeredWorkflowInput
): Promise<TriggeredWorkflowResult> {
    const { triggerId, workflowId, payload = {} } = input;
    const wfLogger = createWorkflowLogger({
        executionId: triggerId,
        workflowName: "TriggeredWorkflow"
    });

    wfLogger.info("Starting triggered workflow", { triggerId, workflowId });

    try {
        // Step 1: Prepare execution (fetch workflow, create execution record, link to trigger)
        const preparation = await prepareTriggeredExecution({
            triggerId,
            workflowId,
            payload
        });

        const execLogger = wfLogger.child({ executionId: preparation.executionId });
        execLogger.info("Prepared execution", { executionId: preparation.executionId });

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
            execLogger.error("Orchestrator failed", error as Error);

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

        execLogger.info("Completed execution", {
            success: orchestratorResult.success,
            hasOutputs: !!orchestratorResult.outputs
        });

        return {
            success: orchestratorResult.success,
            executionId: preparation.executionId,
            outputs: orchestratorResult.outputs,
            error: orchestratorResult.error
        };
    } catch (error) {
        wfLogger.error("Fatal error in triggered workflow", error as Error, {
            triggerId,
            workflowId
        });
        return {
            success: false,
            executionId: "",
            error: `Fatal error in triggered workflow: ${error}`
        };
    }
}
