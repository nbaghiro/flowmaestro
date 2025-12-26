import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "../../shared/logger";
import { interpolateWithObjectSupport } from "../../shared/utils";

const logger = createActivityLogger({ nodeType: "Output" });

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
    logger.debug("Executing output node", {
        outputName: config.outputName,
        format: config.format,
        contextKeys: Object.keys(context)
    });

    // Interpolate variables in value
    const interpolated = interpolateWithObjectSupport(config.value, context);

    // Ensure interpolated value is JsonValue-compatible
    const jsonValue = interpolated as JsonValue;

    // Format conversion
    const value = formatValue(jsonValue, config.format);

    logger.info("Output set", { outputName: config.outputName, format: config.format });

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
                    logger.warn("Value is not valid JSON, returning as string", {
                        suggestion:
                            'Consider changing output format to "string" if this is expected.'
                    });
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
