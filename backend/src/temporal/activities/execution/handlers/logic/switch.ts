/**
 * Switch Node Execution
 *
 * Complete execution logic and handler for multi-way branching nodes.
 * Evaluates an expression against multiple cases with wildcard support.
 */

import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { createActivityLogger, interpolateVariables } from "../../../../core";
import {
    SwitchNodeConfigSchema,
    validateOrThrow,
    type SwitchNodeConfig,
    getExecutionContext
} from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "Switch" });

// ============================================================================
// TYPES
// ============================================================================

export type { SwitchNodeConfig };

export interface SwitchNodeResult {
    matchedCase: string | null;
    matchedValue: JsonValue;
    evaluatedExpression: JsonValue;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if expression matches case value
 * Supports:
 * - Exact match (case-insensitive for strings)
 * - Number comparison
 * - Wildcard patterns (* and ?)
 */
function matchesCase(expressionValue: JsonValue, caseValue: JsonValue): boolean {
    // Handle null/undefined
    if (expressionValue === null || expressionValue === undefined) {
        return caseValue === null || caseValue === undefined;
    }

    // Convert to strings for comparison
    const exprStr = String(expressionValue);
    const caseStr = String(caseValue);

    // Check for wildcard patterns
    if (caseStr.includes("*") || caseStr.includes("?")) {
        return matchesWildcard(exprStr, caseStr);
    }

    // Try numeric comparison
    const exprNum = Number(expressionValue);
    const caseNum = Number(caseValue);
    if (!isNaN(exprNum) && !isNaN(caseNum)) {
        return exprNum === caseNum;
    }

    // Case-insensitive string comparison
    return exprStr.toLowerCase() === caseStr.toLowerCase();
}

/**
 * Match string against wildcard pattern
 * Supports * (any characters) and ? (single character)
 */
function matchesWildcard(str: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
        .replace(/\*/g, ".*") // * matches any characters
        .replace(/\?/g, "."); // ? matches single character

    const regex = new RegExp(`^${regexPattern}$`, "i"); // Case-insensitive
    return regex.test(str);
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Switch node - multi-way branching based on expression value
 */
export async function executeSwitchNode(config: unknown, context: JsonObject): Promise<JsonObject> {
    // Validate config with Zod schema
    const validatedConfig = validateOrThrow(SwitchNodeConfigSchema, config, "Switch");

    // Interpolate and evaluate the expression
    const expressionValue = interpolateVariables(validatedConfig.expression, context);

    logger.debug("Evaluating switch expression", {
        expression: validatedConfig.expression,
        evaluatedValue: JSON.stringify(expressionValue)
    });

    // Try to match against each case
    for (const switchCase of validatedConfig.cases) {
        const caseValue = interpolateVariables(switchCase.value, context);

        if (matchesCase(expressionValue, caseValue)) {
            logger.info("Switch matched case", {
                matchedCase: switchCase.value,
                label: switchCase.label || "unlabeled"
            });

            return {
                matchedCase: switchCase.value,
                matchedValue: caseValue,
                evaluatedExpression: expressionValue
            } as unknown as JsonObject;
        }
    }

    // No match found - use default case
    const defaultCase = validatedConfig.defaultCase || null;
    logger.info("Switch using default case", { defaultCase });

    return {
        matchedCase: defaultCase,
        matchedValue: null,
        evaluatedExpression: expressionValue
    } as unknown as JsonObject;
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Switch node type.
 */
export class SwitchNodeHandler extends BaseNodeHandler {
    readonly name = "SwitchNodeHandler";
    readonly supportedNodeTypes = ["switch"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeSwitchNode(input.nodeConfig, context);

        // Extract matched case for workflow routing
        const switchResult = result as unknown as SwitchNodeResult;
        const selectedRoute = switchResult.matchedCase || "default";

        return this.success(
            result,
            {
                selectedRoute
                // The workflow engine will use selectedRoute to determine which edges to follow
            },
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

/**
 * Factory function for creating Switch handler.
 */
export function createSwitchNodeHandler(): SwitchNodeHandler {
    return new SwitchNodeHandler();
}
