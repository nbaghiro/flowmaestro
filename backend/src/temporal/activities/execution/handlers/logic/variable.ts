/**
 * Variable Node Execution
 *
 * Complete execution logic and handler for variable management nodes.
 * Supports get, set, and delete operations on workflow and global variables.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "../../../../core";
import {
    VariableNodeConfigSchema,
    validateOrThrow,
    interpolateVariables,
    getExecutionContext,
    type VariableNodeConfig
} from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "Variable" });

// ============================================================================
// TYPES
// ============================================================================

export type { VariableNodeConfig };

export interface VariableNodeResult {
    [key: string]: JsonValue;
}

type VariableStore = JsonObject | Map<string, JsonValue>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function setVariable(
    config: VariableNodeConfig,
    context: JsonObject,
    store: VariableStore
): VariableNodeResult {
    let value: JsonValue = interpolateVariables(config.value || "", context);

    if (config.valueType && config.valueType !== "auto") {
        value = convertType(value, config.valueType);
    }

    if (store instanceof Map) {
        store.set(config.variableName, value);
    } else {
        store[config.variableName] = value;
    }

    logger.debug("Variable set", { variableName: config.variableName });

    return { [config.variableName]: value };
}

function getVariable(config: VariableNodeConfig, store: VariableStore): VariableNodeResult {
    const value =
        store instanceof Map ? store.get(config.variableName) : store[config.variableName];

    logger.debug("Variable get", {
        variableName: config.variableName,
        hasValue: value !== undefined
    });

    return { [config.variableName]: value ?? null };
}

function deleteVariable(config: VariableNodeConfig, store: VariableStore): VariableNodeResult {
    if (store instanceof Map) {
        store.delete(config.variableName);
    } else {
        delete store[config.variableName];
    }

    logger.debug("Variable deleted", { variableName: config.variableName });

    return {};
}

function convertType(value: JsonValue, type: string): JsonValue {
    switch (type) {
        case "string":
            return String(value);
        case "number":
            return Number(value);
        case "boolean":
            return value === "true" || value === true;
        case "json":
            return typeof value === "string" ? JSON.parse(value) : value;
        default:
            return value;
    }
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Variable node - manages workflow variables
 */
export async function executeVariableNode(
    config: unknown,
    context: JsonObject,
    globalStore?: Map<string, JsonValue>
): Promise<JsonObject> {
    const validatedConfig = validateOrThrow(VariableNodeConfigSchema, config, "Variable");

    logger.info("Variable operation", {
        operation: validatedConfig.operation,
        variableName: validatedConfig.variableName,
        scope: validatedConfig.scope
    });

    const store = validatedConfig.scope === "global" ? globalStore : context;
    if (!store) {
        throw new Error(`Storage for scope '${validatedConfig.scope}' not available`);
    }

    switch (validatedConfig.operation) {
        case "set":
            return setVariable(validatedConfig, context, store);
        case "get":
            return getVariable(validatedConfig, store);
        case "delete":
            return deleteVariable(validatedConfig, store);
        default:
            throw new Error(`Unsupported variable operation: ${validatedConfig.operation}`);
    }
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Variable node type.
 */
export class VariableNodeHandler extends BaseNodeHandler {
    readonly name = "VariableNodeHandler";
    readonly supportedNodeTypes = ["variable"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeVariableNode(input.nodeConfig, context);

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
 * Factory function for creating Variable handler.
 */
export function createVariableNodeHandler(): VariableNodeHandler {
    return new VariableNodeHandler();
}
