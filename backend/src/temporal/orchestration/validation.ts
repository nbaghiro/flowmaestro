/**
 * Workflow State Validation Activities
 * Activities for validating workflow inputs, outputs, and execution context
 */

import type { JsonObject, WorkflowDefinition } from "@flowmaestro/shared";
import {
    validateWorkflowInputs,
    validateWorkflowOutputs,
    validateWorkflowContext,
    type ValidatedWorkflowDefinition,
    type WorkflowValidationResult
} from "../../core/validation/workflow-state-validation";

/**
 * Validate workflow inputs before execution
 */
export async function validateInputsActivity(params: {
    workflowDefinition: WorkflowDefinition;
    inputs: JsonObject;
}): Promise<WorkflowValidationResult> {
    const { workflowDefinition, inputs } = params;

    console.log(
        `[Validation] Validating workflow inputs for ${workflowDefinition.name || "Unnamed Workflow"}`
    );

    const result = validateWorkflowInputs(
        workflowDefinition as ValidatedWorkflowDefinition,
        inputs
    );

    if (!result.success) {
        console.error(
            `[Validation] Input validation failed: ${result.error?.message}`,
            result.error?.errors
        );
    } else {
        console.log("[Validation] Input validation passed");
    }

    return result;
}

/**
 * Validate workflow outputs after execution
 */
export async function validateOutputsActivity(params: {
    workflowDefinition: WorkflowDefinition;
    outputs: JsonObject;
}): Promise<WorkflowValidationResult> {
    const { workflowDefinition, outputs } = params;

    console.log(
        `[Validation] Validating workflow outputs for ${workflowDefinition.name || "Unnamed Workflow"}`
    );

    const result = validateWorkflowOutputs(
        workflowDefinition as ValidatedWorkflowDefinition,
        outputs
    );

    if (!result.success) {
        console.error(
            `[Validation] Output validation failed: ${result.error?.message}`,
            result.error?.errors
        );
    } else {
        console.log("[Validation] Output validation passed");
    }

    return result;
}

/**
 * Validate workflow execution context (intermediate state)
 */
export async function validateContextActivity(params: {
    workflowDefinition: WorkflowDefinition;
    context: JsonObject;
    nodeId?: string;
}): Promise<WorkflowValidationResult> {
    const { workflowDefinition, context, nodeId } = params;

    console.log(`[Validation] Validating workflow context${nodeId ? ` at node ${nodeId}` : ""}`);

    const result = validateWorkflowContext(
        workflowDefinition as ValidatedWorkflowDefinition,
        context
    );

    if (!result.success) {
        console.error(
            `[Validation] Context validation failed${nodeId ? ` at node ${nodeId}` : ""}: ${result.error?.message}`,
            result.error?.errors
        );
    } else {
        console.log(`[Validation] Context validation passed${nodeId ? ` at node ${nodeId}` : ""}`);
    }

    return result;
}
