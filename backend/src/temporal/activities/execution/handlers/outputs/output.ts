/**
 * Output Node Execution
 *
 * Complete execution logic and handler for output nodes.
 * Sets workflow output values with type conversion support.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "../../../../core";
import {
    OutputNodeConfigSchema,
    validateOrThrow,
    interpolateWithObjectSupport,
    getExecutionContext,
    type OutputNodeConfig
} from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "Output" });

// ============================================================================
// TYPES
// ============================================================================

export type { OutputNodeConfig };

export interface OutputNodeResult {
    outputs: JsonObject;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatValue(value: JsonValue, format: string): JsonValue {
    switch (format) {
        case "json":
            if (typeof value === "string") {
                try {
                    return JSON.parse(value);
                } catch (_e) {
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

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Output node - sets workflow output values
 */
export async function executeOutputNode(config: unknown, context: JsonObject): Promise<JsonObject> {
    const validatedConfig = validateOrThrow(OutputNodeConfigSchema, config, "Output");

    logger.debug("Executing output node", {
        outputName: validatedConfig.outputName,
        format: validatedConfig.format,
        contextKeys: Object.keys(context)
    });

    const interpolated = interpolateWithObjectSupport(validatedConfig.value, context);
    const jsonValue = interpolated as JsonValue;
    const value = formatValue(jsonValue, validatedConfig.format);

    logger.info("Output set", {
        outputName: validatedConfig.outputName,
        format: validatedConfig.format
    });

    return {
        [validatedConfig.outputName]: value
    } as unknown as JsonObject;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Output node type.
 */
export class OutputNodeHandler extends BaseNodeHandler {
    readonly name = "OutputNodeHandler";
    readonly supportedNodeTypes = ["output"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeOutputNode(input.nodeConfig, context);

        return this.success(
            result,
            {},
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

/**
 * Factory function for creating Output handler.
 */
export function createOutputNodeHandler(): OutputNodeHandler {
    return new OutputNodeHandler();
}
