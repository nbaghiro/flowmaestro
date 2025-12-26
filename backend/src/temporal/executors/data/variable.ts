import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { interpolateVariables } from "../../shared/utils";
import { createActivityLogger } from "../../shared/logger";

const logger = createActivityLogger({ nodeType: "Variable" });

export interface VariableNodeConfig {
    operation: "set" | "get" | "delete";
    variableName: string;
    value?: string;
    scope: "workflow" | "global" | "temporary";
    valueType?: "auto" | "string" | "number" | "boolean" | "json";
}

export interface VariableNodeResult {
    [key: string]: JsonValue;
}

type VariableStore = JsonObject | Map<string, JsonValue>;

/**
 * Execute Variable node - manages workflow variables
 */
export async function executeVariableNode(
    config: VariableNodeConfig,
    context: JsonObject,
    globalStore?: Map<string, JsonValue>
): Promise<JsonObject> {
    logger.info("Variable operation", {
        operation: config.operation,
        variableName: config.variableName,
        scope: config.scope
    });

    const store = config.scope === "global" ? globalStore : context;
    if (!store) {
        throw new Error(`Storage for scope '${config.scope}' not available`);
    }

    switch (config.operation) {
        case "set":
            return setVariable(config, context, store);
        case "get":
            return getVariable(config, store);
        case "delete":
            return deleteVariable(config, store);
        default:
            throw new Error(`Unsupported variable operation: ${config.operation}`);
    }
}

function setVariable(
    config: VariableNodeConfig,
    context: JsonObject,
    store: VariableStore
): VariableNodeResult {
    let value: JsonValue = interpolateVariables(config.value || "", context);

    // Type conversion
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

    logger.debug("Variable get", { variableName: config.variableName, hasValue: value !== undefined });

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
