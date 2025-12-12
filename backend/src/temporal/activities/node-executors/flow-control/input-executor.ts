// Minimal JSON types – can be replaced later with shared types if needed
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface JsonObject {
    [key: string]: JsonValue | undefined;
    input?: JsonObject;
}
export type JsonSchema = unknown;

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

// ---- Spec: InputNodeConfig ----

interface InputNodeConfig {
    inputType: "manual" | "json" | "csv" | "form";
    schema?: JsonSchema;
    sampleData?: JsonValue;
    description?: string;
    requiredFields?: string[];
}

// ---- Spec: executeInputNode ----

// No execution needed - data passed from trigger/manual run
// Validates against schema if provided
export async function executeInputNode(
    config: InputNodeConfig,
    context: JsonObject
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

    // Merge input into context (spec: return { ...context, ...context.input })
    return {
        ...context,
        ...(context.input ?? {})
    };
}
