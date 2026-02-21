/**
 * Persona Input Validator
 *
 * Server-side validation for structured persona inputs based on field definitions.
 * Builds dynamic Zod schemas from PersonaInputField[] to enforce type-specific validation.
 */

import { z, ZodSchema, ZodError, ZodIssue } from "zod";
import type { PersonaInputField, PersonaStructuredInputs } from "@flowmaestro/shared";

/**
 * Result of input validation
 */
export interface ValidationResult {
    success: boolean;
    data?: PersonaStructuredInputs;
    errors?: ValidationError[];
}

/**
 * Structured validation error with field path
 */
export interface ValidationError {
    path: string;
    message: string;
    code: string;
}

/**
 * Builds a Zod schema for a single input field based on its type and validation rules
 */
function buildFieldSchema(field: PersonaInputField): ZodSchema {
    const validation = field.validation || {};

    switch (field.type) {
        case "text": {
            let schema = z.string();
            if (validation.min_length !== undefined) {
                schema = schema.min(validation.min_length, {
                    message: `Must be at least ${validation.min_length} characters`
                });
            }
            if (validation.max_length !== undefined) {
                schema = schema.max(validation.max_length, {
                    message: `Must be at most ${validation.max_length} characters`
                });
            }
            if (validation.pattern) {
                schema = schema.regex(new RegExp(validation.pattern), {
                    message: "Does not match required pattern"
                });
            }
            return field.required ? schema.min(1, { message: "Required" }) : schema.optional();
        }

        case "textarea": {
            let schema = z.string();
            if (validation.min_length !== undefined) {
                schema = schema.min(validation.min_length, {
                    message: `Must be at least ${validation.min_length} characters`
                });
            }
            if (validation.max_length !== undefined) {
                schema = schema.max(validation.max_length, {
                    message: `Must be at most ${validation.max_length} characters`
                });
            }
            return field.required ? schema.min(1, { message: "Required" }) : schema.optional();
        }

        case "number": {
            let schema = z.number();
            if (validation.min !== undefined) {
                schema = schema.min(validation.min, {
                    message: `Must be at least ${validation.min}`
                });
            }
            if (validation.max !== undefined) {
                schema = schema.max(validation.max, {
                    message: `Must be at most ${validation.max}`
                });
            }
            return field.required ? schema : schema.optional();
        }

        case "select": {
            if (!field.options || field.options.length === 0) {
                // No options defined - accept any string
                return field.required ? z.string().min(1) : z.string().optional();
            }
            const validValues = field.options.map((opt) => opt.value);
            const schema = z.enum(validValues as [string, ...string[]]);
            return field.required ? schema : schema.optional();
        }

        case "multiselect": {
            if (!field.options || field.options.length === 0) {
                return field.required
                    ? z.array(z.string()).min(1, { message: "Select at least one option" })
                    : z.array(z.string()).optional();
            }
            const validValues = field.options.map((opt) => opt.value);
            const itemSchema = z.enum(validValues as [string, ...string[]]);
            let schema = z.array(itemSchema);
            if (validation.min !== undefined) {
                schema = schema.min(validation.min, {
                    message: `Select at least ${validation.min} options`
                });
            }
            if (validation.max !== undefined) {
                schema = schema.max(validation.max, {
                    message: `Select at most ${validation.max} options`
                });
            }
            return field.required
                ? schema.min(1, { message: "Select at least one option" })
                : schema.optional();
        }

        case "tags": {
            let schema = z.array(z.string());
            if (validation.min !== undefined) {
                schema = schema.min(validation.min, {
                    message: `Add at least ${validation.min} tags`
                });
            }
            if (validation.max !== undefined) {
                schema = schema.max(validation.max, {
                    message: `Add at most ${validation.max} tags`
                });
            }
            return field.required
                ? schema.min(1, { message: "Add at least one tag" })
                : schema.optional();
        }

        case "checkbox": {
            // Checkbox returns boolean
            // For required checkboxes (e.g., "I agree to terms"), we require true
            return field.required
                ? z.boolean().refine((val) => val === true, { message: "Must be checked" })
                : z.boolean().optional();
        }

        case "file": {
            // File inputs are validated separately via the upload endpoint
            // Here we just validate the structure of file references
            const fileSchema = z.object({
                gcs_uri: z.string().min(1),
                filename: z.string().min(1),
                file_type: z.string().min(1),
                file_size_bytes: z.number().optional()
            });

            let arraySchema = z.array(fileSchema);

            if (validation.max_files !== undefined) {
                arraySchema = arraySchema.max(validation.max_files, {
                    message: `Upload at most ${validation.max_files} files`
                });
            }

            return field.required
                ? arraySchema.min(1, { message: "Upload at least one file" })
                : arraySchema.optional();
        }

        default: {
            // Unknown field type - accept any value
            return field.required ? z.unknown() : z.unknown().optional();
        }
    }
}

/**
 * Builds a complete Zod schema from an array of input field definitions
 */
export function buildStructuredInputSchema(inputFields: PersonaInputField[]): ZodSchema {
    if (!inputFields || inputFields.length === 0) {
        // No fields defined - accept any record
        return z.record(z.any()).optional();
    }

    const shape: Record<string, ZodSchema> = {};

    for (const field of inputFields) {
        shape[field.name] = buildFieldSchema(field);
    }

    return z.object(shape).passthrough(); // passthrough allows extra fields
}

/**
 * Converts Zod errors to our ValidationError format
 */
function formatZodErrors(error: ZodError): ValidationError[] {
    return error.errors.map((issue: ZodIssue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code
    }));
}

/**
 * Validates structured inputs against persona input field definitions
 *
 * @param inputFields - Array of field definitions from the persona
 * @param inputs - User-provided input values
 * @returns Validation result with success status and either data or errors
 */
export function validateStructuredInputs(
    inputFields: PersonaInputField[],
    inputs: PersonaStructuredInputs | undefined
): ValidationResult {
    const schema = buildStructuredInputSchema(inputFields);

    // Handle case where no inputs provided
    if (!inputs) {
        // Check if any fields are required
        const hasRequiredFields = inputFields.some((f) => f.required);
        if (hasRequiredFields) {
            const missingFields = inputFields
                .filter((f) => f.required)
                .map((f) => ({
                    path: f.name,
                    message: "Required",
                    code: "required"
                }));
            return { success: false, errors: missingFields };
        }
        return { success: true, data: {} };
    }

    const result = schema.safeParse(inputs);

    if (result.success) {
        return { success: true, data: result.data as PersonaStructuredInputs };
    }

    return {
        success: false,
        errors: formatZodErrors(result.error)
    };
}

/**
 * Applies default values to missing optional fields
 *
 * @param inputFields - Array of field definitions
 * @param inputs - User-provided inputs
 * @returns Inputs with defaults applied
 */
export function applyInputDefaults(
    inputFields: PersonaInputField[],
    inputs: PersonaStructuredInputs | undefined
): PersonaStructuredInputs {
    const result: PersonaStructuredInputs = { ...(inputs || {}) };

    for (const field of inputFields) {
        if (result[field.name] === undefined && field.default_value !== undefined) {
            result[field.name] = field.default_value;
        }
    }

    return result;
}
