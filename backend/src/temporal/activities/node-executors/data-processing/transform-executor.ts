import jsonata from "jsonata";
import { parseStringPromise } from "xml2js";
import type { JsonObject, JsonValue, JsonArray } from "@flowmaestro/shared";
import { getVariableValue } from "../../../utils/node-execution/utils";

export interface TransformNodeConfig {
    operation:
        | "map"
        | "filter"
        | "reduce"
        | "sort"
        | "merge"
        | "extract"
        | "custom"
        | "parseXML"
        | "parseJSON";
    inputData: string;
    expression: string;
    outputVariable: string;
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
        case "map":
            result = await executeMap(inputData, config.expression, context);
            break;
        case "filter":
            result = await executeFilter(inputData, config.expression, context);
            break;
        case "reduce":
            result = await executeReduce(inputData, config.expression, context);
            break;
        case "sort":
            result = await executeSort(inputData, config.expression);
            break;
        case "merge":
            result = await executeMerge(inputData, config.expression, context);
            break;
        case "extract":
            result = await executeExtract(inputData, config.expression);
            break;
        case "custom":
            result = await executeJSONata(inputData, config.expression, context);
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
    return await expr.evaluate({ ...context, $data: data });
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
