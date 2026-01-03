/**
 * Transform Node Execution
 *
 * Complete execution logic and handler for data transformation nodes.
 * Supports map, filter, reduce, sort, merge, extract, custom JSONata, parseXML, parseJSON.
 */

import jsonata from "jsonata";
import { parseStringPromise } from "xml2js";
import type { JsonObject, JsonValue, JsonArray } from "@flowmaestro/shared";
import { createActivityLogger } from "../../../../core";
import {
    TransformNodeConfigSchema,
    validateOrThrow,
    getExecutionContext,
    type TransformNodeConfig
} from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "Transform" });

// ============================================================================
// TYPES
// ============================================================================

export type { TransformNodeConfig };

export interface TransformNodeResult {
    [key: string]: JsonValue;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getVariableValue(varRef: string, context: JsonObject): JsonValue {
    const varName = varRef.replace(/^\$\{/, "").replace(/\}$/, "");
    return getNestedValue(context, varName);
}

function getNestedValue(obj: JsonValue, path: string): JsonValue {
    const keys = path.split(".");
    let value: JsonValue = obj;

    for (const key of keys) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
            value = value[key];
        } else {
            return null;
        }
    }

    return value;
}

// ============================================================================
// TRANSFORM OPERATIONS
// ============================================================================

async function executeMap(
    data: JsonValue,
    expression: string,
    context: JsonObject
): Promise<JsonArray> {
    if (!Array.isArray(data)) {
        throw new Error("Map operation requires array input");
    }

    if (expression.includes("=>")) {
        const fn = eval(`(${expression})`);
        return data.map(fn);
    }

    const expr = jsonata(expression);
    return await expr.evaluate({ items: data, ...context });
}

async function executeFilter(
    data: JsonValue,
    expression: string,
    context: JsonObject
): Promise<JsonArray> {
    if (!Array.isArray(data)) {
        throw new Error("Filter operation requires array input");
    }

    if (expression.includes("=>")) {
        const fn = eval(`(${expression})`);
        return data.filter(fn);
    }

    const expr = jsonata(`items[${expression}]`);
    return await expr.evaluate({ items: data, ...context });
}

async function executeReduce(
    data: JsonValue,
    expression: string,
    context: JsonObject
): Promise<JsonValue> {
    if (!Array.isArray(data)) {
        throw new Error("Reduce operation requires array input");
    }

    if (expression.includes("=>")) {
        const fn = eval(`(${expression})`);
        return data.reduce(fn);
    }

    const expr = jsonata(expression);
    return await expr.evaluate({ items: data, ...context });
}

async function executeSort(data: JsonValue, expression: string): Promise<JsonArray> {
    if (!Array.isArray(data)) {
        throw new Error("Sort operation requires array input");
    }

    if (expression.includes("=>")) {
        const fn = eval(`(${expression})`);
        return [...data].sort(fn);
    }

    return [...data].sort((a, b) => {
        const aVal = getNestedValue(a, expression);
        const bVal = getNestedValue(b, expression);
        if (aVal === null || bVal === null) return 0;
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
}

async function executeMerge(
    data: JsonValue,
    expression: string,
    context: JsonObject
): Promise<JsonValue> {
    const varsToMerge = expression.match(/\$\{([^}]+)\}/g) || [];
    const values = varsToMerge.map((varRef) => getVariableValue(varRef, context));

    if (Array.isArray(data)) {
        return values.reduce<JsonArray>(
            (acc, val) => {
                if (Array.isArray(val)) {
                    return [...acc, ...val];
                }
                return acc;
            },
            [...data]
        );
    } else if (typeof data === "object" && data !== null) {
        return values.reduce<JsonObject>(
            (acc, val) => {
                if (typeof val === "object" && val !== null && !Array.isArray(val)) {
                    return { ...acc, ...val };
                }
                return acc;
            },
            { ...data }
        );
    } else {
        return data;
    }
}

async function executeExtract(data: JsonValue, expression: string): Promise<JsonValue> {
    return getNestedValue(data, expression);
}

async function executeJSONata(
    data: JsonValue,
    expression: string,
    context: JsonObject
): Promise<JsonValue> {
    const expr = jsonata(expression);
    return await expr.evaluate({ ...context, $data: data });
}

async function parseXML(xmlString: string): Promise<JsonValue> {
    if (typeof xmlString !== "string") {
        throw new Error("parseXML requires string input");
    }

    return await parseStringPromise(xmlString, {
        explicitArray: false,
        mergeAttrs: true
    });
}

function parseJSON(jsonString: string): JsonValue {
    if (typeof jsonString !== "string") {
        throw new Error("parseJSON requires string input");
    }

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error(`Invalid JSON: ${error}`);
    }
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Transform node - performs data transformations
 */
export async function executeTransformNode(
    config: unknown,
    context: JsonObject
): Promise<JsonObject> {
    const validatedConfig = validateOrThrow(TransformNodeConfigSchema, config, "Transform");

    const inputData = getVariableValue(validatedConfig.inputData, context);

    logger.info("Executing transform", {
        operation: validatedConfig.operation,
        inputType: typeof inputData,
        isArray: Array.isArray(inputData)
    });

    let result: JsonValue;

    switch (validatedConfig.operation) {
        case "map":
            result = await executeMap(inputData, validatedConfig.expression, context);
            break;
        case "filter":
            result = await executeFilter(inputData, validatedConfig.expression, context);
            break;
        case "reduce":
            result = await executeReduce(inputData, validatedConfig.expression, context);
            break;
        case "sort":
            result = await executeSort(inputData, validatedConfig.expression);
            break;
        case "merge":
            result = await executeMerge(inputData, validatedConfig.expression, context);
            break;
        case "extract":
            result = await executeExtract(inputData, validatedConfig.expression);
            break;
        case "custom":
            result = await executeJSONata(inputData, validatedConfig.expression, context);
            break;
        case "parseXML":
            if (typeof inputData !== "string") {
                throw new Error("parseXML requires string input");
            }
            result = await parseXML(inputData);
            break;
        case "parseJSON":
            if (typeof inputData !== "string") {
                throw new Error("parseJSON requires string input");
            }
            result = parseJSON(inputData);
            break;
        default:
            throw new Error(`Unsupported transform operation: ${validatedConfig.operation}`);
    }

    logger.debug("Transform completed", {
        resultType: typeof result,
        isArray: Array.isArray(result),
        arrayLength: Array.isArray(result) ? (result as JsonArray).length : undefined
    });

    return {
        [validatedConfig.outputVariable]: result
    } as unknown as JsonObject;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Transform node type.
 */
export class TransformNodeHandler extends BaseNodeHandler {
    readonly name = "TransformNodeHandler";
    readonly supportedNodeTypes = ["transform"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeTransformNode(input.nodeConfig, context);

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
 * Factory function for creating Transform handler.
 */
export function createTransformNodeHandler(): TransformNodeHandler {
    return new TransformNodeHandler();
}
