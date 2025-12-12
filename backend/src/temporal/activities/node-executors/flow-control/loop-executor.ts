import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { interpolateVariables } from "../../../../core/utils/interpolate-variables";

export interface LoopNodeConfig {
    loopType: "forEach" | "while" | "count";

    // For forEach loops
    arrayPath?: string; // Variable path to array: ${items}, ${data.results}
    itemVariable?: string; // Variable name for current item (default: 'item')
    indexVariable?: string; // Variable name for index (default: 'index')

    // For while loops
    condition?: string; // Condition to evaluate: ${count} < 10
    maxIterations?: number; // Safety limit (default: 1000)

    // For count loops
    count?: number; // Number of iterations
    startIndex?: number; // Starting index (default: 0)
}

export interface LoopNodeResult {
    iterations: number;
    items?: JsonValue[]; // Array items for forEach
    completed: boolean; // Whether loop completed normally (vs hitting max iterations)
}

/**
 * Execute Loop node - iterate over array or repeat N times
 *
 * Note: The actual loop execution happens in the workflow orchestrator.
 * This executor just prepares the loop metadata and validates config.
 */
export async function executeLoopNode(
    config: LoopNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    console.log(`[Loop] Type: ${config.loopType}`);

    switch (config.loopType) {
        case "forEach":
            return await prepareForEachLoop(config, context);
        case "while":
            return await prepareWhileLoop(config, context);
        case "count":
            return await prepareCountLoop(config, context);
        default:
            throw new Error(`Unknown loop type: ${config.loopType}`);
    }
}

/**
 * Prepare forEach loop - extract array and prepare iteration variables
 */
async function prepareForEachLoop(
    config: LoopNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    if (!config.arrayPath) {
        throw new Error("arrayPath is required for forEach loop");
    }

    // Extract array from context
    const arrayPath = interpolateVariables(config.arrayPath, context);
    const array = resolveArrayPath(arrayPath, context);

    if (!Array.isArray(array)) {
        throw new Error(
            `arrayPath "${config.arrayPath}" did not resolve to an array. Got: ${typeof array}`
        );
    }

    console.log(`[Loop] forEach: ${array.length} items`);

    return {
        iterations: array.length,
        items: array as JsonValue[],
        completed: true
    } as unknown as JsonObject;
}

/**
 * Prepare while loop - validate condition
 */
async function prepareWhileLoop(config: LoopNodeConfig, _context: JsonObject): Promise<JsonObject> {
    if (!config.condition) {
        throw new Error("condition is required for while loop");
    }

    const maxIterations = config.maxIterations || 1000;

    console.log(`[Loop] while: condition="${config.condition}", max=${maxIterations}`);

    // Note: Actual while loop execution happens in workflow orchestrator
    // This just returns metadata
    return {
        iterations: 0, // Will be determined during execution
        completed: false
    } as unknown as JsonObject;
}

/**
 * Prepare count loop - simple N iterations
 */
async function prepareCountLoop(config: LoopNodeConfig, context: JsonObject): Promise<JsonObject> {
    if (config.count === undefined) {
        throw new Error("count is required for count loop");
    }

    const count =
        typeof config.count === "string"
            ? Number(interpolateVariables(config.count, context))
            : config.count;

    if (isNaN(count) || count < 0) {
        throw new Error(`Invalid count: ${config.count}`);
    }

    console.log(`[Loop] count: ${count} iterations`);

    return {
        iterations: count,
        completed: true
    } as unknown as JsonObject;
}

/**
 * Resolve array path from context
 * Supports: ${arrayName}, ${obj.array}, ${data.items[0]}
 */
function resolveArrayPath(path: string, context: JsonObject): JsonValue {
    // If path starts with ${, it's already interpolated, just return it
    if (!path.includes("$")) {
        // Direct property access
        return context[path];
    }

    // Path was interpolated but returned a string - try to evaluate
    try {
        return JSON.parse(path);
    } catch {
        // Not JSON, check if it's a variable name
        return context[path];
    }
}
