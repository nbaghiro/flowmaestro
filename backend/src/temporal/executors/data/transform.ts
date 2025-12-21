import jsonata from "jsonata";
import { parseStringPromise } from "xml2js";
import type { JsonObject, JsonValue, JsonArray } from "@flowmaestro/shared";

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
    inputData: string; // Variable reference like "${httpResponse}"
    expression: string;
    outputVariable: string;
}

export interface TransformNodeResult {
    [key: string]: JsonValue; // The transformed data stored under outputVariable name
}

/**
 * Execute Transform node - performs data transformations
 */
export async function executeTransformNode(
    config: TransformNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    // Get input data from context
    const inputData = getVariableValue(config.inputData, context);

    console.log(`[Transform] Operation: ${config.operation}`);
    console.log(
        `[Transform] Input type: ${typeof inputData}, ${Array.isArray(inputData) ? "array" : "object"}`
    );

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

    console.log(
        `[Transform] Result type: ${typeof result}, ${Array.isArray(result) ? `array[${(result as JsonArray).length}]` : "object"}`
    );

    // Return result with the output variable name
    return {
        [config.outputVariable]: result
    } as unknown as JsonObject;
}

async function executeMap(
    data: JsonValue,
    expression: string,
    context: JsonObject
): Promise<JsonArray> {
    if (!Array.isArray(data)) {
        throw new Error("Map operation requires array input");
    }

    // If expression is JavaScript function string
    if (expression.includes("=>")) {
        const fn = eval(`(${expression})`);
        return data.map(fn);
    }

    // Otherwise use JSONata
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

    // If expression is JavaScript function string
    if (expression.includes("=>")) {
        const fn = eval(`(${expression})`);
        return data.filter(fn);
    }

    // Otherwise use JSONata with predicate
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

    // If expression is JavaScript function string
    if (expression.includes("=>")) {
        const fn = eval(`(${expression})`);
        return data.reduce(fn);
    }

    // Otherwise use JSONata aggregation
    const expr = jsonata(expression);
    return await expr.evaluate({ items: data, ...context });
}

async function executeSort(data: JsonValue, expression: string): Promise<JsonArray> {
    if (!Array.isArray(data)) {
        throw new Error("Sort operation requires array input");
    }

    // If expression is JavaScript comparator function
    if (expression.includes("=>")) {
        const fn = eval(`(${expression})`);
        return [...data].sort(fn);
    }

    // Otherwise sort by property path
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
    // Parse expression to get variables to merge
    const varsToMerge = expression.match(/\$\{([^}]+)\}/g) || [];
    const values = varsToMerge.map((varRef) => getVariableValue(varRef, context));

    if (Array.isArray(data)) {
        // Merge arrays
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
        // Merge objects
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
        // Primitive types - return as is
        return data;
    }
}

async function executeExtract(data: JsonValue, expression: string): Promise<JsonValue> {
    // Extract nested property
    return getNestedValue(data, expression);
}

async function executeJSONata(
    data: JsonValue,
    expression: string,
    context: JsonObject
): Promise<JsonValue> {
    const expr = jsonata(expression);
    // Evaluate with full context so expressions can reference all variables
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

/**
 * Get variable value from context using ${variableName} syntax
 */
function getVariableValue(varRef: string, context: JsonObject): JsonValue {
    // Remove ${ and } if present
    const varName = varRef.replace(/^\$\{/, "").replace(/\}$/, "");
    return getNestedValue(context, varName);
}

/**
 * Get nested property value using dot notation
 */
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
