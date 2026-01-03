/**
 * Input Node Handler
 *
 * Simple input node that provides text or JSON data to the workflow.
 * The value is configured directly in the node config panel.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "../../../../core";
import {
    InputNodeConfigSchema,
    validateOrThrow,
    type InputNodeConfig
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "Input" });

// ============================================================================
// TYPES
// ============================================================================

export type { InputNodeConfig };

export interface InputNodeResult {
    inputType: string;
    value: JsonValue;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Input node type.
 * Simply returns the configured value.
 */
export class InputNodeHandler extends BaseNodeHandler {
    readonly name = "InputNodeHandler";
    readonly supportedNodeTypes = ["input"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(InputNodeConfigSchema, input.nodeConfig, "Input");

        logger.info("Processing input node", {
            inputType: config.inputType,
            hasValue: !!config.value
        });

        // Parse JSON if type is json, otherwise use as text
        let outputValue: JsonValue = config.value;

        if (config.inputType === "json" && config.value) {
            try {
                outputValue = JSON.parse(config.value);
            } catch {
                logger.warn("Failed to parse JSON value, using as string", {
                    nodeId: input.metadata.nodeId
                });
            }
        }

        const result: InputNodeResult = {
            inputType: config.inputType,
            value: outputValue
        };

        return this.success(
            {
                input: outputValue,
                _inputMetadata: result as unknown as JsonObject
            },
            {},
            { durationMs: Date.now() - startTime }
        );
    }
}

/**
 * Factory function for creating Input handler.
 */
export function createInputNodeHandler(): InputNodeHandler {
    return new InputNodeHandler();
}
