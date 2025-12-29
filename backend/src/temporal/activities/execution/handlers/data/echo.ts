/**
 * Echo Node Execution
 *
 * Complete execution logic and handler for echo/debug nodes.
 * Supports simple echo, transform, delay, and error modes for testing workflows.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "../../../../core";
import {
    EchoNodeConfigSchema,
    validateOrThrow,
    interpolateVariables,
    getExecutionContext,
    type EchoNodeConfig
} from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "Echo" });

// ============================================================================
// TYPES
// ============================================================================

export type { EchoNodeConfig };

export interface EchoNodeResult {
    mode: string;
    output: JsonValue;
    context?: JsonObject;
    timestamp?: string;
    metadata?: {
        executionTime: number;
    };
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Echo node - for testing and debugging workflows
 */
export async function executeEchoNode(config: unknown, context: JsonObject): Promise<JsonObject> {
    const validatedConfig = validateOrThrow(EchoNodeConfigSchema, config, "Echo");

    const startTime = Date.now();

    logger.info("Echo node executing", { mode: validatedConfig.mode });

    let output: JsonValue;

    switch (validatedConfig.mode) {
        case "simple":
            output = {
                message: validatedConfig.message
                    ? interpolateVariables(validatedConfig.message, context)
                    : "Echo!",
                ...(validatedConfig.includeContext ? { context } : {}),
                ...(validatedConfig.includeTimestamp ? { timestamp: new Date().toISOString() } : {})
            };
            break;

        case "transform": {
            const inputValue = validatedConfig.inputVariable
                ? context[validatedConfig.inputVariable]
                : JSON.stringify(context);

            const inputString =
                typeof inputValue === "string" ? inputValue : JSON.stringify(inputValue);

            switch (validatedConfig.transformation) {
                case "uppercase":
                    output = inputString.toUpperCase();
                    break;
                case "lowercase":
                    output = inputString.toLowerCase();
                    break;
                case "reverse":
                    output = inputString.split("").reverse().join("");
                    break;
                case "json":
                    output = JSON.stringify(inputValue, null, 2);
                    break;
                case "base64":
                    output = Buffer.from(inputString).toString("base64");
                    break;
                default:
                    output = inputValue;
            }
            break;
        }

        case "delay": {
            const delay = validatedConfig.delayMs;
            logger.debug("Echo delay mode", { delayMs: delay });
            await new Promise((resolve) => setTimeout(resolve, delay));
            output = {
                message: "Delay completed",
                delayMs: delay
            };
            break;
        }

        case "error": {
            const errorMsg = validatedConfig.errorMessage || "Test error from Echo node";
            if (validatedConfig.errorType === "throw") {
                throw new Error(errorMsg);
            } else {
                output = {
                    error: true,
                    message: errorMsg
                };
            }
            break;
        }

        default:
            throw new Error(`Unsupported echo mode: ${validatedConfig.mode}`);
    }

    logger.debug("Echo output", { outputType: typeof output });

    const result: EchoNodeResult = {
        mode: validatedConfig.mode,
        output,
        metadata: {
            executionTime: Date.now() - startTime
        }
    };

    if (validatedConfig.outputVariable) {
        return { [validatedConfig.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Echo node type.
 */
export class EchoNodeHandler extends BaseNodeHandler {
    readonly name = "EchoNodeHandler";
    readonly supportedNodeTypes = ["echo"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeEchoNode(input.nodeConfig, context);

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
 * Factory function for creating Echo handler.
 */
export function createEchoNodeHandler(): EchoNodeHandler {
    return new EchoNodeHandler();
}
