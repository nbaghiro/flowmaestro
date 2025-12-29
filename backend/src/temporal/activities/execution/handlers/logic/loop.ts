/**
 * Loop Node Execution
 *
 * Complete execution logic and handler for loop nodes.
 * Supports forEach, while, and count-based iteration patterns.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger, interpolateVariables } from "../../../../core";
import {
    LoopNodeConfigSchema,
    validateOrThrow,
    type LoopNodeConfig,
    getExecutionContext
} from "../../../../core";
import {
    BaseNodeHandler,
    type NodeHandlerInput,
    type NodeHandlerOutput,
    type LoopMetadata
} from "../../types";

const logger = createActivityLogger({ nodeType: "Loop" });

// ============================================================================
// TYPES
// ============================================================================

export type { LoopNodeConfig };

export interface LoopNodeResult {
    iterations: number;
    items?: JsonValue[]; // Array items for forEach
    completed: boolean; // Whether loop completed normally (vs hitting max iterations)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

// ============================================================================
// LOOP PREPARATION FUNCTIONS
// ============================================================================

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

    logger.info("forEach loop prepared", { itemCount: array.length });

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

    logger.info("while loop prepared", { condition: config.condition, maxIterations });

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

    logger.info("count loop prepared", { count });

    return {
        iterations: count,
        completed: true
    } as unknown as JsonObject;
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Loop node - iterate over array or repeat N times
 *
 * Note: The actual loop execution happens in the workflow orchestrator.
 * This executor just prepares the loop metadata and validates config.
 */
export async function executeLoopNode(config: unknown, context: JsonObject): Promise<JsonObject> {
    // Validate config with Zod schema
    const validatedConfig = validateOrThrow(LoopNodeConfigSchema, config, "Loop");

    logger.info("Preparing loop", { loopType: validatedConfig.loopType });

    switch (validatedConfig.loopType) {
        case "forEach":
            return await prepareForEachLoop(validatedConfig, context);
        case "while":
            return await prepareWhileLoop(validatedConfig, context);
        case "count":
            return await prepareCountLoop(validatedConfig, context);
        default:
            throw new Error(`Unknown loop type: ${validatedConfig.loopType}`);
    }
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Loop node type.
 */
export class LoopNodeHandler extends BaseNodeHandler {
    readonly name = "LoopNodeHandler";
    readonly supportedNodeTypes = ["loop", "forEach", "while", "repeat"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeLoopNode(input.nodeConfig, context);

        // Extract loop information for workflow control
        const loopResult = result as unknown as LoopNodeResult;

        // Build loop metadata for the workflow engine
        const loopMetadata: LoopMetadata = {
            shouldContinue: loopResult.iterations > 0,
            currentIndex: 0,
            totalItems: loopResult.iterations,
            currentItem: loopResult.items?.[0],
            accumulatedResults: [],
            wasBreakTriggered: false
        };

        return this.success(
            result,
            {
                loopMetadata
                // The workflow engine will use loopMetadata to control iteration
            },
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

/**
 * Factory function for creating Loop handler.
 */
export function createLoopNodeHandler(): LoopNodeHandler {
    return new LoopNodeHandler();
}
