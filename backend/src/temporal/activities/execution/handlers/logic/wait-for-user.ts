/**
 * Wait For User Node Handler
 *
 * Handles human-in-the-loop patterns by pausing workflow for user input.
 * Supports text, number, boolean, and JSON input types with validation.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "../../../../core";
import {
    WaitForUserNodeConfigSchema,
    validateOrThrow,
    type WaitForUserNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "WaitForUser" });

// ============================================================================
// TYPES
// ============================================================================

export type { WaitForUserNodeConfig };

export interface WaitForUserNodeResult {
    variableName: string;
    inputType: string;
    value: JsonValue;
    source: "provided" | "default" | "user";
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for WaitForUser node type.
 * Pauses workflow execution when user input is required.
 */
export class WaitForUserNodeHandler extends BaseNodeHandler {
    readonly name = "WaitForUserNodeHandler";
    readonly supportedNodeTypes = ["waitForUser"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(
            WaitForUserNodeConfigSchema,
            input.nodeConfig,
            "WaitForUser"
        );

        logger.info("Processing wait for user node", {
            variableName: config.variableName,
            inputType: config.inputType,
            required: config.required
        });

        // Check if input was already provided (e.g., when resuming from pause)
        const existingValue = input.context.inputs?.[config.variableName];

        if (existingValue !== undefined) {
            logger.debug("Input value found in workflow inputs", {
                variableName: config.variableName
            });

            const result: WaitForUserNodeResult = {
                variableName: config.variableName,
                inputType: config.inputType,
                value: existingValue as JsonValue,
                source: "provided"
            };

            return this.success(
                {
                    [config.outputVariable]: existingValue,
                    _waitForUserMetadata: result as unknown as JsonObject
                },
                {},
                { durationMs: Date.now() - startTime }
            );
        }

        // Check for default value on non-required input
        if (!config.required && config.defaultValue !== undefined) {
            logger.debug("Using default value for optional input", {
                variableName: config.variableName
            });

            const result: WaitForUserNodeResult = {
                variableName: config.variableName,
                inputType: config.inputType,
                value: config.defaultValue as JsonValue,
                source: "default"
            };

            return this.success(
                {
                    [config.outputVariable]: config.defaultValue as JsonValue,
                    _waitForUserMetadata: result as unknown as JsonObject
                } as JsonObject,
                {},
                { durationMs: Date.now() - startTime }
            );
        }

        // No input provided - pause for human input
        logger.info("Pausing workflow for user input", {
            variableName: config.variableName,
            nodeId: input.metadata.nodeId
        });

        return this.pauseExecution(
            {
                waitingFor: config.variableName,
                inputType: config.inputType,
                ...(config.prompt && { prompt: config.prompt }),
                ...(config.description && { description: config.description }),
                ...(config.placeholder && { placeholder: config.placeholder }),
                ...(config.validation && { validation: config.validation as unknown as JsonObject })
            },
            {
                reason: `Waiting for user input: ${config.prompt || config.variableName}`,
                nodeId: input.metadata.nodeId,
                pausedAt: Date.now(),
                resumeTrigger: "signal",
                preservedData: {
                    variableName: config.variableName,
                    inputType: config.inputType,
                    outputVariable: config.outputVariable,
                    ...(config.validation && {
                        validation: config.validation as unknown as JsonObject
                    }),
                    required: config.required
                }
            },
            { durationMs: Date.now() - startTime }
        );
    }
}

/**
 * Factory function for creating WaitForUser handler.
 */
export function createWaitForUserNodeHandler(): WaitForUserNodeHandler {
    return new WaitForUserNodeHandler();
}
