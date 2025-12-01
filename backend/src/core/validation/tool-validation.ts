/**
 * Tool Validation Utilities
 * Implements Mastra-inspired tool input/output validation with Zod
 */

import { z, ZodError, ZodSchema } from "zod";
import type { JsonObject } from "@flowmaestro/shared";
import type { Tool } from "../../storage/models/Agent";

/**
 * Result of tool validation
 */
export interface ValidationResult<T = JsonObject> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        errors: ValidationError[];
    };
}

/**
 * Validation error details
 */
export interface ValidationError {
    path: string;
    message: string;
    code: string;
}

/**
 * Enhanced tool definition with Zod schemas
 */
export interface ValidatedTool extends Tool {
    inputSchema?: ZodSchema;
    outputSchema?: ZodSchema;
}

/**
 * Convert JSON Schema to Zod schema (basic conversion)
 * For more complex schemas, tools should provide Zod schemas directly
 */
export function jsonSchemaToZod(jsonSchema: JsonObject): ZodSchema {
    const type = jsonSchema.type as string;

    switch (type) {
        case "object": {
            const properties = (jsonSchema.properties as Record<string, JsonObject>) || {};
            const required = (jsonSchema.required as string[]) || [];

            const shape: Record<string, ZodSchema> = {};

            for (const [key, propSchema] of Object.entries(properties)) {
                const propZod = jsonSchemaToZod(propSchema);
                shape[key] = required.includes(key) ? propZod : propZod.optional();
            }

            return z.object(shape);
        }

        case "string": {
            let schema = z.string();

            if (jsonSchema.minLength) {
                schema = schema.min(jsonSchema.minLength as number);
            }
            if (jsonSchema.maxLength) {
                schema = schema.max(jsonSchema.maxLength as number);
            }
            if (jsonSchema.pattern) {
                schema = schema.regex(new RegExp(jsonSchema.pattern as string));
            }
            if (jsonSchema.enum) {
                return z.enum(jsonSchema.enum as [string, ...string[]]);
            }

            return schema;
        }

        case "number":
        case "integer": {
            let schema = type === "integer" ? z.number().int() : z.number();

            if (jsonSchema.minimum !== undefined) {
                schema = schema.min(jsonSchema.minimum as number);
            }
            if (jsonSchema.maximum !== undefined) {
                schema = schema.max(jsonSchema.maximum as number);
            }

            return schema;
        }

        case "boolean":
            return z.boolean();

        case "array": {
            const items = jsonSchema.items as JsonObject | undefined;
            if (!items) {
                return z.array(z.unknown());
            }

            const itemSchema = jsonSchemaToZod(items);
            let schema = z.array(itemSchema);

            if (jsonSchema.minItems) {
                schema = schema.min(jsonSchema.minItems as number);
            }
            if (jsonSchema.maxItems) {
                schema = schema.max(jsonSchema.maxItems as number);
            }

            return schema;
        }

        case "null":
            return z.null();

        default:
            return z.unknown();
    }
}

/**
 * Format Zod errors for LLM consumption
 */
export function formatZodErrors(error: ZodError): ValidationError[] {
    return error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code
    }));
}

/**
 * Format validation errors as a human-readable message
 */
export function formatValidationMessage(errors: ValidationError[]): string {
    if (errors.length === 0) {
        return "Validation failed";
    }

    const messages = errors.map((err) => {
        const pathStr = err.path ? `${err.path}: ` : "";
        return `- ${pathStr}${err.message}`;
    });

    return `Validation errors:\n${messages.join("\n")}`;
}

/**
 * Validate tool input arguments
 */
export function validateToolInput(tool: Tool, input: unknown): ValidationResult {
    try {
        // Convert JSON Schema to Zod if no Zod schema provided
        const validatedTool = tool as ValidatedTool;
        const schema = validatedTool.inputSchema || jsonSchemaToZod(tool.schema);

        // Validate
        const result = schema.safeParse(input);

        if (!result.success) {
            const errors = formatZodErrors(result.error);
            return {
                success: false,
                error: {
                    message: formatValidationMessage(errors),
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
 * Validate tool output
 */
export function validateToolOutput(tool: ValidatedTool, output: unknown): ValidationResult {
    if (!tool.outputSchema) {
        // No output schema defined, skip validation
        return {
            success: true,
            data: output as JsonObject
        };
    }

    try {
        const result = tool.outputSchema.safeParse(output);

        if (!result.success) {
            const errors = formatZodErrors(result.error);
            return {
                success: false,
                error: {
                    message: formatValidationMessage(errors),
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
 * Create a validation error response for LLM to retry
 */
export function createValidationErrorResponse(
    toolName: string,
    validation: ValidationResult
): JsonObject {
    const errors = validation.error?.errors || [];
    const serializedErrors = errors.map((err) => ({
        path: err.path,
        message: err.message,
        code: err.code
    }));

    return {
        error: true,
        tool: toolName,
        message: validation.error?.message || "Validation failed",
        validationErrors: serializedErrors,
        hint: "Please retry the tool call with correct arguments matching the schema."
    };
}

/**
 * Coerce types in tool arguments (e.g., string "123" to number 123)
 */
export function coerceToolArguments(tool: Tool, args: JsonObject): JsonObject {
    // This is a simple implementation
    // For production, you might want more sophisticated coercion

    const coerced: JsonObject = { ...args };
    const schema = tool.schema;

    if (schema.type === "object" && schema.properties) {
        const properties = schema.properties as Record<string, JsonObject>;

        for (const [key, propSchema] of Object.entries(properties)) {
            if (key in coerced) {
                const value = coerced[key];
                const propType = propSchema.type as string;

                // Coerce numbers
                if (propType === "number" || propType === "integer") {
                    if (typeof value === "string" && !isNaN(Number(value))) {
                        coerced[key] = Number(value);
                    }
                }

                // Coerce booleans
                if (propType === "boolean") {
                    if (typeof value === "string") {
                        coerced[key] = value === "true";
                    }
                }
            }
        }
    }

    return coerced;
}
