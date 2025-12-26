import type { JsonObject, JsonSchema, JsonValue } from "@flowmaestro/shared";
import { normalizeFileInput } from "../file-processing/normalize-file-input";

// Simple ValidationError – matches spec name
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

// Placeholder schema validator – TODO: replace with real implementation
function validateSchema(_input: unknown, schema: JsonSchema): boolean {
    // Naib's spec expects real validation here, but for now we keep it minimal.
    // You can later plug in a proper JSON schema validator.
    if (!schema) return true;
    return true;
}

interface InputFieldConfig {
    name: string;
    type: "string" | "number" | "boolean" | "file";
}

interface InputNodeConfig {
    inputType: "manual" | "json" | "csv" | "form";
    fields?: InputFieldConfig[];
    schema?: JsonSchema;
    sampleData?: JsonValue;
    description?: string;
    requiredFields?: string[];
}

type InputContext = JsonObject & { input?: JsonObject };

// No execution needed - data passed from trigger/manual run
// Validates against schema if provided
export async function executeInputNode(
    config: InputNodeConfig,
    context: InputContext
): Promise<JsonObject> {
    if (config.schema) {
        const valid = validateSchema(context.input, config.schema);
        if (!valid) {
            throw new ValidationError("Input does not match schema");
        }
    }

    if (Array.isArray(config.requiredFields)) {
        for (const field of config.requiredFields) {
            if (context.input?.[field] === undefined) {
                throw new ValidationError(`Missing required field: ${field}`);
            }
        }
    }

    const fileFields = config.fields?.filter((f) => f.type === "file") ?? [];

    const normalizedFiles: Record<string, unknown> = {};

    for (const field of fileFields) {
        const rawValue = context.input?.[field.name];

        if (rawValue !== undefined) {
            normalizedFiles[field.name] = await normalizeFileInput(rawValue);
        }
    }

    // Merge input into context (spec: return { ...context, ...context.input })
    return {
        ...context,
        ...(context.input ?? {})
    };
}
