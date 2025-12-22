import jsonata from "jsonata";
import { parseStringPromise } from "xml2js";
import type { JsonObject, JsonValue, JsonArray } from "@flowmaestro/shared";
import { getVariableValue } from "../../../../core/utils/interpolate-variables";
import { executeAggregateNode } from "./aggregate-executor";
import { executeDeduplicateNode } from "./deduplicate-executor";
import { executeFilterNode } from "./filter-executor";

export interface TransformNodeConfig {
    operation:
        | "map"
        | "filter"
        | "aggregate"
        | "deduplicate"
        | "reduce"
        | "sort"
        | "merge"
        | "extract"
        | "parseXML"
        | "parseJSON"
        | "custom";
    inputData: string;
    outputVariable: string;

    // map / filter
    expression?: string;

    // aggregate
    operationType?: "sum" | "count" | "avg" | "min" | "max" | "first" | "last";
    field?: string;
    groupBy?: string;

    // deduplicate
    keyFields?: string[];
    keep?: "first" | "last";
    caseSensitive?: boolean;
}

export interface TransformNodeResult {
    [key: string]: JsonValue;
}

export async function executeTransformNode(
    config: TransformNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    let inputData = getVariableValue<JsonValue>(config.inputData, context);

    // Allow custom transforms to handle missing data (e.g., provide defaults via expression)
    if (inputData === undefined) {
        if (config.operation === "custom") {
            inputData = null;
        } else {
            throw new Error(`Variable ${config.inputData} is undefined`);
        }
    }

    let result: JsonValue;

    switch (config.operation) {
        // =========================
        // Inline Transform ops
        // =========================

        case "map": {
            const value = await executeMap(inputData, config.expression!, context);
            return { [config.outputVariable]: value };
        }

        case "reduce": {
            const value = await executeReduce(inputData, config.expression!, context);
            return { [config.outputVariable]: value };
        }

        case "sort": {
            const value = await executeSort(inputData, config.expression!);
            return { [config.outputVariable]: value };
        }

        case "merge": {
            const value = await executeMerge(inputData, config.expression!, context);
            return { [config.outputVariable]: value };
        }

        case "extract": {
            const value = await executeExtract(inputData, config.expression!);
            return { [config.outputVariable]: value };
        }

        case "parseXML": {
            const value = await parseXML(String(inputData));
            return { [config.outputVariable]: value };
        }

        case "parseJSON": {
            const value = parseJSON(String(inputData));
            return { [config.outputVariable]: value };
        }

        case "custom": {
            const value = await executeJSONata(inputData, config.expression!, context);
            return { [config.outputVariable]: value };
        }

        // =========================
        // Delegated ops (NEW)
        // =========================

        case "aggregate":
            return executeAggregateNode(
                {
                    inputArray: config.inputData,
                    operation: config.operationType!,
                    field: config.field,
                    groupBy: config.groupBy,
                    outputVariable: config.outputVariable
                },
                context
            );

        case "deduplicate":
            return executeDeduplicateNode(
                {
                    inputArray: config.inputData,
                    keyFields: config.keyFields!,
                    keep: config.keep ?? "first",
                    caseSensitive: config.caseSensitive ?? true,
                    outputVariable: config.outputVariable
                },
                context
            );

        case "filter":
            return executeFilterNode(
                {
                    inputArray: config.inputData,
                    expression: config.expression!,
                    mode: "keep",
                    outputVariable: config.outputVariable
                },
                context
            );

        default:
            throw new Error(`Unsupported transform operation: ${config.operation}`);
    }

    return {
        [config.outputVariable]: result
    } as JsonObject;
}

async function executeMap(
    data: JsonValue,
    expression: string,
    context: JsonObject
): Promise<JsonArray> {
    if (!Array.isArray(data)) {
        throw new Error("Map operation requires array input");
    }

    // JavaScript arrow function
    if (expression.includes("=>")) {
        const fn = eval(`(${expression})`);
        return data.map(fn);
    }

    // JSONata array mapping
    const expr = jsonata(expression);
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
            (acc, val) => (Array.isArray(val) ? [...acc, ...val] : acc),
            [...data]
        );
    }

    if (data !== null && typeof data === "object" && !Array.isArray(data)) {
        return values.reduce<JsonObject>(
            (acc, val) =>
                val !== null && typeof val === "object" && !Array.isArray(val)
                    ? { ...acc, ...val }
                    : acc,
            { ...(data as JsonObject) }
        );
    }

    return data;
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
    // Pass data as a bound variable so expressions like $count($data) work
    return await expr.evaluate({ ...context }, { data });
}

async function parseXML(xmlString: string): Promise<JsonValue> {
    return await parseStringPromise(xmlString, {
        explicitArray: false,
        mergeAttrs: true
    });
}

function parseJSON(jsonString: string): JsonValue {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error(`Invalid JSON: ${error}`);
    }
}

/**
 * Keep Transform's original `getNestedValue`
 * because Transform relies on `null` as the “not found” sentinel.
 */
function getNestedValue(obj: JsonValue, path: string): JsonValue {
    const keys = path.split(".");
    let value: JsonValue = obj;

    for (const key of keys) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
            value = (value as JsonObject)[key];
        } else {
            return null;
        }
    }

    return value;
}
