/**
 * Tool Validation Utilities
 * Implements Mastra-inspired tool input/output validation with Zod
 *
 * Critical Gap Fix: Added validateToolSchema to validate JSON Schema structure
 * before coercion, preventing bypass of validation through malformed schemas.
 */

import { z, ZodError, ZodSchema } from "zod";
import type { JsonObject } from "@flowmaestro/shared";
import type { Tool } from "../storage/models/Agent";
import { createServiceLogger } from "../core/logging";

const logger = createServiceLogger("ToolValidation");

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
 * Result of schema validation
 */
export interface SchemaValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Enhanced tool definition with Zod schemas
 */
export interface ValidatedTool extends Tool {
    inputSchema?: ZodSchema;
    outputSchema?: ZodSchema;
}

/**
 * Valid JSON Schema types
 */
const VALID_JSON_SCHEMA_TYPES = ["string", "number", "integer", "boolean", "array", "object", "null"] as const;
type ValidJsonSchemaType = typeof VALID_JSON_SCHEMA_TYPES[number];

/**
 * Validate that a JSON Schema is well-formed and safe
 *
 * Critical Fix: Validates schema structure BEFORE coercion to prevent:
 * - Malformed schemas that could bypass validation
 * - Injection of dangerous schema patterns
 * - Circular references that could cause infinite loops
 *
 * @param schema The JSON Schema to validate
 * @param depth Current recursion depth (to prevent infinite recursion)
 * @returns Validation result with any errors found
 */
export function validateToolSchema(schema: unknown, depth: number = 0): SchemaValidationResult {
    const errors: string[] = [];
    const MAX_DEPTH = 10;

    // Prevent infinite recursion
    if (depth > MAX_DEPTH) {
        errors.push(`Schema nesting exceeds maximum depth of ${MAX_DEPTH}`);
        return { valid: false, errors };
    }

    // Schema must be an object
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
        errors.push("Schema must be a non-null object");
        return { valid: false, errors };
    }

    const schemaObj = schema as Record<string, unknown>;

    // Check for required 'type' property
    if (!schemaObj.type) {
        // Allow schemas without type if they have $ref, oneOf, anyOf, allOf
        const hasComposite = ["$ref", "oneOf", "anyOf", "allOf"].some(key => key in schemaObj);
        if (!hasComposite) {
            errors.push("Schema must have a 'type' property or use $ref/oneOf/anyOf/allOf");
        }
    } else {
        // Validate type is a known JSON Schema type
        const schemaTypes = Array.isArray(schemaObj.type) ? schemaObj.type : [schemaObj.type];

        for (const t of schemaTypes) {
            if (typeof t !== "string" || !VALID_JSON_SCHEMA_TYPES.includes(t as ValidJsonSchemaType)) {
                errors.push(`Invalid schema type: "${t}". Must be one of: ${VALID_JSON_SCHEMA_TYPES.join(", ")}`);
            }
        }
    }

    // Validate object properties recursively
    if (schemaObj.type === "object" && schemaObj.properties) {
        if (typeof schemaObj.properties !== "object" || Array.isArray(schemaObj.properties)) {
            errors.push("'properties' must be an object");
        } else {
            const props = schemaObj.properties as Record<string, unknown>;
            for (const [propName, propSchema] of Object.entries(props)) {
                // Check for dangerous property names that could cause prototype pollution
                if (propName === "__proto__" || propName === "constructor" || propName === "prototype") {
                    errors.push(`Potentially dangerous property name: "${propName}"`);
                }

                // Recursively validate nested schema
                const nestedResult = validateToolSchema(propSchema, depth + 1);
                if (!nestedResult.valid) {
                    errors.push(...nestedResult.errors.map(e => `properties.${propName}: ${e}`));
                }
            }
        }

        // Validate 'required' array
        if (schemaObj.required !== undefined) {
            if (!Array.isArray(schemaObj.required)) {
                errors.push("'required' must be an array of strings");
            } else {
                for (const req of schemaObj.required) {
                    if (typeof req !== "string") {
                        errors.push(`'required' array must contain only strings, got: ${typeof req}`);
                    }
                }
            }
        }
    }

    // Validate array items recursively
    if (schemaObj.type === "array" && schemaObj.items) {
        const itemsResult = validateToolSchema(schemaObj.items, depth + 1);
        if (!itemsResult.valid) {
            errors.push(...itemsResult.errors.map(e => `items: ${e}`));
        }
    }

    // Validate enum values
    if (schemaObj.enum !== undefined) {
        if (!Array.isArray(schemaObj.enum)) {
            errors.push("'enum' must be an array");
        } else if (schemaObj.enum.length === 0) {
            errors.push("'enum' must have at least one value");
        }
    }

    // Check for $ref (external references could be dangerous)
    if (schemaObj.$ref !== undefined) {
        if (typeof schemaObj.$ref !== "string") {
            errors.push("'$ref' must be a string");
        } else if (schemaObj.$ref.startsWith("http://") || schemaObj.$ref.startsWith("https://")) {
            errors.push("External $ref URLs are not allowed for security reasons");
        }
    }

    // Validate numeric constraints
    if (schemaObj.type === "number" || schemaObj.type === "integer") {
        if (schemaObj.minimum !== undefined && typeof schemaObj.minimum !== "number") {
            errors.push("'minimum' must be a number");
        }
        if (schemaObj.maximum !== undefined && typeof schemaObj.maximum !== "number") {
            errors.push("'maximum' must be a number");
        }
        if (schemaObj.minimum !== undefined && schemaObj.maximum !== undefined) {
            if ((schemaObj.minimum as number) > (schemaObj.maximum as number)) {
                errors.push("'minimum' cannot be greater than 'maximum'");
            }
        }
    }

    // Validate string constraints
    if (schemaObj.type === "string") {
        if (schemaObj.minLength !== undefined) {
            if (typeof schemaObj.minLength !== "number" || schemaObj.minLength < 0) {
                errors.push("'minLength' must be a non-negative number");
            }
        }
        if (schemaObj.maxLength !== undefined) {
            if (typeof schemaObj.maxLength !== "number" || schemaObj.maxLength < 0) {
                errors.push("'maxLength' must be a non-negative number");
            }
        }
        if (schemaObj.pattern !== undefined) {
            if (typeof schemaObj.pattern !== "string") {
                errors.push("'pattern' must be a string");
            } else {
                // Try to compile the regex to catch invalid patterns
                try {
                    new RegExp(schemaObj.pattern as string);
                } catch (e) {
                    errors.push(`Invalid regex pattern: ${(e as Error).message}`);
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
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
 *
 * Critical Fix: Now validates the JSON Schema structure first before
 * attempting to convert to Zod and validate input. This prevents
 * malformed schemas from bypassing validation.
 */
export function validateToolInput(tool: Tool, input: unknown): ValidationResult {
    try {
        // CRITICAL: Validate schema structure first
        const schemaValidation = validateToolSchema(tool.schema);
        if (!schemaValidation.valid) {
            logger.error(
                { toolName: tool.name, errors: schemaValidation.errors },
                "Tool has invalid JSON Schema"
            );
            return {
                success: false,
                error: {
                    message: `Tool "${tool.name}" has an invalid schema: ${schemaValidation.errors.join("; ")}`,
                    errors: schemaValidation.errors.map(e => ({
                        path: "schema",
                        message: e,
                        code: "invalid_schema"
                    }))
                }
            };
        }

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
        logger.error(
            { toolName: tool.name, err: error instanceof Error ? error : new Error(String(error)) },
            "Tool validation failed with exception"
        );
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
 * Create a validation error response - tells LLM to proceed without the tool
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
        hint: "This tool call failed due to invalid arguments. Do NOT retry this tool. Respond to the user without using this tool, or use a different tool if appropriate."
    };
}

/**
 * Coerce types in tool arguments (e.g., string "123" to number 123)
 *
 * Critical Fix: Now validates schema before coercion and performs
 * safe coercion only for known, validated property types.
 */
export function coerceToolArguments(tool: Tool, args: JsonObject): JsonObject {
    // CRITICAL: Validate schema structure first
    const schemaValidation = validateToolSchema(tool.schema);
    if (!schemaValidation.valid) {
        logger.warn(
            { toolName: tool.name, errors: schemaValidation.errors },
            "Skipping coercion for tool with invalid schema"
        );
        // Return args unchanged - validation will catch the schema error
        return args;
    }

    const coerced: JsonObject = { ...args };
    const schema = tool.schema;

    if (schema.type === "object" && schema.properties) {
        const properties = schema.properties as Record<string, JsonObject>;

        for (const [key, propSchema] of Object.entries(properties)) {
            if (key in coerced) {
                const value = coerced[key];
                const propType = propSchema.type as string;

                // Only coerce from string to target type (safe coercion)
                if (typeof value === "string") {
                    // Coerce numbers - validate it's actually numeric
                    if (propType === "number" || propType === "integer") {
                        const trimmed = value.trim();
                        // Only coerce if it's a valid numeric string
                        if (trimmed !== "" && !isNaN(Number(trimmed)) && isFinite(Number(trimmed))) {
                            const numValue = Number(trimmed);
                            // For integers, ensure it's a whole number
                            if (propType === "integer" && !Number.isInteger(numValue)) {
                                // Don't coerce - let validation fail
                                continue;
                            }
                            coerced[key] = numValue;
                        }
                    }

                    // Coerce booleans - only exact matches
                    if (propType === "boolean") {
                        const lower = value.toLowerCase().trim();
                        if (lower === "true") {
                            coerced[key] = true;
                        } else if (lower === "false") {
                            coerced[key] = false;
                        }
                        // Otherwise leave as-is for validation to catch
                    }

                    // Coerce arrays from JSON strings
                    if (propType === "array") {
                        const trimmed = value.trim();
                        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                            try {
                                const parsed = JSON.parse(trimmed);
                                if (Array.isArray(parsed)) {
                                    coerced[key] = parsed;
                                }
                            } catch {
                                // Invalid JSON - leave as string for validation
                            }
                        }
                    }

                    // Coerce objects from JSON strings
                    if (propType === "object") {
                        const trimmed = value.trim();
                        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                            try {
                                const parsed = JSON.parse(trimmed);
                                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                                    coerced[key] = parsed;
                                }
                            } catch {
                                // Invalid JSON - leave as string for validation
                            }
                        }
                    }
                }
            }
        }
    }

    return coerced;
}
