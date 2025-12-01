/**
 * Workflow State Validation Utilities
 * Validates workflow inputs, outputs, and execution context using Zod schemas
 */

import { z, ZodError, ZodSchema } from "zod";
import type { JsonObject, WorkflowDefinition } from "@flowmaestro/shared";

/**
 * Result of workflow state validation
 */
export interface WorkflowValidationResult<T = JsonObject> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        errors: WorkflowValidationError[];
    };
}

/**
 * Validation error details
 */
export interface WorkflowValidationError {
    path: string;
    message: string;
    code: string;
}

/**
 * Workflow definition with optional state schemas
 */
export interface ValidatedWorkflowDefinition extends WorkflowDefinition {
    stateSchema?: {
        inputs?: ZodSchema;
        outputs?: ZodSchema;
        context?: ZodSchema;
    };
}

/**
 * Format Zod errors for workflow validation
 */
export function formatWorkflowZodErrors(error: ZodError): WorkflowValidationError[] {
    return error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code
    }));
}

/**
 * Format validation errors as a human-readable message
 */
export function formatWorkflowValidationMessage(errors: WorkflowValidationError[]): string {
    if (errors.length === 0) {
        return "Workflow validation failed";
    }

    const messages = errors.map((err) => {
        const pathStr = err.path ? `${err.path}: ` : "";
        return `- ${pathStr}${err.message}`;
    });

    return `Workflow validation errors:\n${messages.join("\n")}`;
}

/**
 * Validate workflow inputs against schema
 */
export function validateWorkflowInputs(
    workflowDefinition: ValidatedWorkflowDefinition,
    inputs: unknown
): WorkflowValidationResult {
    // If no input schema defined, skip validation
    if (!workflowDefinition.stateSchema?.inputs) {
        return {
            success: true,
            data: inputs as JsonObject
        };
    }

    try {
        const result = workflowDefinition.stateSchema.inputs.safeParse(inputs);

        if (!result.success) {
            const errors = formatWorkflowZodErrors(result.error);
            return {
                success: false,
                error: {
                    message: formatWorkflowValidationMessage(errors),
                    errors
                }
            };
        }

        return {
            success: true,
            data: result.data as JsonObject
        };
    } catch (error) {
        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Unknown validation error",
                errors: []
            }
        };
    }
}

/**
 * Validate workflow outputs against schema
 */
export function validateWorkflowOutputs(
    workflowDefinition: ValidatedWorkflowDefinition,
    outputs: unknown
): WorkflowValidationResult {
    // If no output schema defined, skip validation
    if (!workflowDefinition.stateSchema?.outputs) {
        return {
            success: true,
            data: outputs as JsonObject
        };
    }

    try {
        const result = workflowDefinition.stateSchema.outputs.safeParse(outputs);

        if (!result.success) {
            const errors = formatWorkflowZodErrors(result.error);
            return {
                success: false,
                error: {
                    message: formatWorkflowValidationMessage(errors),
                    errors
                }
            };
        }

        return {
            success: true,
            data: result.data as JsonObject
        };
    } catch (error) {
        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Unknown validation error",
                errors: []
            }
        };
    }
}

/**
 * Validate workflow execution context against schema
 */
export function validateWorkflowContext(
    workflowDefinition: ValidatedWorkflowDefinition,
    context: unknown
): WorkflowValidationResult {
    // If no context schema defined, skip validation
    if (!workflowDefinition.stateSchema?.context) {
        return {
            success: true,
            data: context as JsonObject
        };
    }

    try {
        const result = workflowDefinition.stateSchema.context.safeParse(context);

        if (!result.success) {
            const errors = formatWorkflowZodErrors(result.error);
            return {
                success: false,
                error: {
                    message: formatWorkflowValidationMessage(errors),
                    errors
                }
            };
        }

        return {
            success: true,
            data: result.data as JsonObject
        };
    } catch (error) {
        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Unknown validation error",
                errors: []
            }
        };
    }
}

/**
 * Pre-defined common workflow input schemas
 */
export const CommonWorkflowSchemas = {
    /**
     * Schema for text input workflows
     */
    textInput: z.object({
        text: z.string().min(1, "Text input cannot be empty")
    }),

    /**
     * Schema for file upload workflows
     */
    fileInput: z.object({
        fileUrl: z.string().url("Must be a valid URL"),
        fileName: z.string().min(1, "File name is required"),
        mimeType: z.string().optional()
    }),

    /**
     * Schema for JSON data workflows
     */
    jsonInput: z.object({
        data: z.record(z.unknown())
    }),

    /**
     * Schema for webhook workflows
     */
    webhookInput: z.object({
        headers: z.record(z.string()).optional(),
        body: z.unknown(),
        query: z.record(z.string()).optional()
    }),

    /**
     * Schema for scheduled workflows
     */
    scheduleInput: z.object({
        scheduledTime: z.string().datetime(),
        triggerType: z.literal("schedule")
    })
};

/**
 * Pre-defined common workflow output schemas
 */
export const CommonWorkflowOutputSchemas = {
    /**
     * Schema for text output workflows
     */
    textOutput: z.object({
        result: z.string()
    }),

    /**
     * Schema for JSON output workflows
     */
    jsonOutput: z.object({
        data: z.record(z.unknown())
    }),

    /**
     * Schema for success/failure workflows
     */
    statusOutput: z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional()
    })
};

/**
 * Create a validated workflow definition with schemas
 */
export function createValidatedWorkflow(
    definition: WorkflowDefinition,
    schemas?: {
        inputs?: ZodSchema;
        outputs?: ZodSchema;
        context?: ZodSchema;
    }
): ValidatedWorkflowDefinition {
    return {
        ...definition,
        stateSchema: schemas
    };
}
