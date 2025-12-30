/**
 * Input Node Handler
 *
 * Handles user input collection during workflow execution.
 * Supports human-in-the-loop patterns by pausing workflow for user input.
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
    inputName: string;
    inputType: string;
    value: JsonValue;
    source: "provided" | "default" | "user";
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Input node - retrieves or waits for user input
 */
export async function executeInputNode(
    config: unknown,
    context: JsonObject,
    providedInputs?: JsonObject
): Promise<{ result: JsonObject; needsUserInput: boolean }> {
    const validatedConfig = validateOrThrow(InputNodeConfigSchema, config, "Input");

    logger.info("Processing input node", {
        inputName: validatedConfig.inputName,
        inputType: validatedConfig.inputType,
        required: validatedConfig.required
    });

    // Check if input was already provided in workflow inputs
    const existingValue =
        providedInputs?.[validatedConfig.inputName] ?? context[validatedConfig.inputName];

    if (existingValue !== undefined) {
        logger.debug("Using provided input value", {
            inputName: validatedConfig.inputName,
            source: "provided"
        });

        const result: InputNodeResult = {
            inputName: validatedConfig.inputName,
            inputType: validatedConfig.inputType,
            value: existingValue as JsonValue,
            source: "provided"
        };

        return {
            result: {
                [validatedConfig.outputVariable]: existingValue,
                _inputMetadata: result
            } as JsonObject,
            needsUserInput: false
        };
    }

    // Check if there's a default value and input is not required
    if (!validatedConfig.required && validatedConfig.defaultValue !== undefined) {
        logger.debug("Using default value for optional input", {
            inputName: validatedConfig.inputName
        });

        const result: InputNodeResult = {
            inputName: validatedConfig.inputName,
            inputType: validatedConfig.inputType,
            value: validatedConfig.defaultValue as JsonValue,
            source: "default"
        };

        return {
            result: {
                [validatedConfig.outputVariable]: validatedConfig.defaultValue,
                _inputMetadata: result
            } as JsonObject,
            needsUserInput: false
        };
    }

    // No input provided and it's required - need to pause for user input
    logger.info("Input required but not provided, workflow will pause", {
        inputName: validatedConfig.inputName
    });

    return {
        result: {
            waitingFor: validatedConfig.inputName,
            inputType: validatedConfig.inputType,
            label: validatedConfig.label,
            description: validatedConfig.description,
            placeholder: validatedConfig.placeholder,
            required: validatedConfig.required,
            validation: validatedConfig.validation
        } as JsonObject,
        needsUserInput: true
    };
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Input node type.
 * Pauses workflow execution when user input is required.
 */
export class InputNodeHandler extends BaseNodeHandler {
    readonly name = "InputNodeHandler";
    readonly supportedNodeTypes = ["input", "userInput"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(InputNodeConfigSchema, input.nodeConfig, "Input");

        // Check if input was already provided in workflow inputs
        const existingValue = input.context.inputs?.[config.inputName];

        if (existingValue !== undefined) {
            // Input already provided - continue execution
            logger.debug("Input value found in workflow inputs", {
                inputName: config.inputName
            });

            const result: InputNodeResult = {
                inputName: config.inputName,
                inputType: config.inputType,
                value: existingValue as JsonValue,
                source: "provided"
            };

            return this.success(
                {
                    [config.outputVariable]: existingValue,
                    _inputMetadata: result as unknown as JsonObject
                },
                {},
                { durationMs: Date.now() - startTime }
            );
        }

        // Check for default value on non-required input
        if (!config.required && config.defaultValue !== undefined) {
            logger.debug("Using default value for optional input", {
                inputName: config.inputName
            });

            const result: InputNodeResult = {
                inputName: config.inputName,
                inputType: config.inputType,
                value: config.defaultValue as JsonValue,
                source: "default"
            };

            return this.success(
                {
                    [config.outputVariable]: config.defaultValue as JsonValue,
                    _inputMetadata: result as unknown as JsonObject
                } as JsonObject,
                {},
                { durationMs: Date.now() - startTime }
            );
        }

        // No input provided - pause for human input
        logger.info("Pausing workflow for user input", {
            inputName: config.inputName,
            nodeId: input.metadata.nodeId
        });

        return this.pauseExecution(
            {
                waitingFor: config.inputName,
                inputType: config.inputType,
                ...(config.label && { label: config.label }),
                ...(config.description && { description: config.description }),
                ...(config.placeholder && { placeholder: config.placeholder }),
                ...(config.validation && { validation: config.validation as unknown as JsonObject })
            },
            {
                reason: `Waiting for user input: ${config.label || config.inputName}`,
                nodeId: input.metadata.nodeId,
                pausedAt: Date.now(),
                resumeTrigger: "signal",
                preservedData: {
                    inputName: config.inputName,
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
 * Factory function for creating Input handler.
 */
export function createInputNodeHandler(): InputNodeHandler {
    return new InputNodeHandler();
}
