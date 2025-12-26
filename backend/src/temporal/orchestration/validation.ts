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
import { activityLogger } from "../shared/logger";

/**
 * Validate workflow inputs before execution
 */
export async function validateInputsActivity(params: {
    workflowDefinition: WorkflowDefinition;
    inputs: JsonObject;
}): Promise<WorkflowValidationResult> {
    const { workflowDefinition, inputs } = params;

    activityLogger.info("Validating workflow inputs", {
        workflowName: workflowDefinition.name || "Unnamed Workflow"
    });

    const result = validateWorkflowInputs(
        workflowDefinition as ValidatedWorkflowDefinition,
        inputs
    );

    if (!result.success) {
        activityLogger.error(
            "Input validation failed",
            new Error(result.error?.message || "Unknown error"),
            {
                errors: result.error?.errors
            }
        );
    } else {
        activityLogger.info("Input validation passed");
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

    activityLogger.info("Validating workflow outputs", {
        workflowName: workflowDefinition.name || "Unnamed Workflow"
    });

    const result = validateWorkflowOutputs(
        workflowDefinition as ValidatedWorkflowDefinition,
        outputs
    );

    if (!result.success) {
        activityLogger.error(
            "Output validation failed",
            new Error(result.error?.message || "Unknown error"),
            {
                errors: result.error?.errors
            }
        );
    } else {
        activityLogger.info("Output validation passed");
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

    activityLogger.info("Validating workflow context", { nodeId });

    const result = validateWorkflowContext(
        workflowDefinition as ValidatedWorkflowDefinition,
        context
    );

    if (!result.success) {
        activityLogger.error(
            "Context validation failed",
            new Error(result.error?.message || "Unknown error"),
            {
                nodeId,
                errors: result.error?.errors
            }
        );
    } else {
        activityLogger.info("Context validation passed", { nodeId });
    }

    return result;
}
