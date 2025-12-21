import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { interpolateWithObjectSupport } from "../../shared/utils";

export interface OutputNodeConfig {
    outputName: string;
    value: string;
    format: "json" | "string" | "number" | "boolean";
    description?: string;
}

export interface OutputNodeResult {
    outputs: JsonObject;
}

/**
 * Execute Output node - sets workflow output values
 */
export async function executeOutputNode(
    config: OutputNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    console.log(`[Output] Config: ${JSON.stringify(config)}`);
    console.log(`[Output] Context keys: ${Object.keys(context).join(", ")}`);

    // Interpolate variables in value
    const interpolated = interpolateWithObjectSupport(config.value, context);
    console.log(`[Output] Interpolated value: ${JSON.stringify(interpolated)}`);

    // Ensure interpolated value is JsonValue-compatible
    const jsonValue = interpolated as JsonValue;

    // Format conversion
    const value = formatValue(jsonValue, config.format);

    console.log(
        `[Output] Set output '${config.outputName}' = ${JSON.stringify(value)} (${config.format})`
    );

    // Return outputs directly at top level (like other executors do with outputVariable)
    return {
        [config.outputName]: value
    } as unknown as JsonObject;
}

function formatValue(value: JsonValue, format: string): JsonValue {
    switch (format) {
        case "json":
            if (typeof value === "string") {
                try {
                    return JSON.parse(value);
                } catch (_e) {
                    // If the string is not valid JSON, return it as-is
                    // This handles cases like LLM text responses that aren't JSON
                    console.warn(
                        "[Output] Value is not valid JSON, returning as string. " +
                            'Consider changing output format to "string" if this is expected.'
                    );
                    return value;
                }
            }
            return value;
        case "string":
            return String(value);
        case "number":
            return Number(value);
        case "boolean":
            return Boolean(value);
        default:
            return value;
    }
}
