import type { JsonObject } from "@flowmaestro/shared";
import { evaluateExpression } from "../../../utils/node-execution/expression-evaluator";

export interface RouterCondition {
    name: string;
    expression: string;
    description?: string;
}

export interface RouterNodeConfig {
    conditions: RouterCondition[];
    defaultOutput: string;
    evaluationMode: "first" | "all";
}

/**
 * Router Node Executor
 * Evaluates each condition against workflow context.
 * Returns __routeOutputs → tells orchestrator which edges to follow.
 */
export async function executeRouterNode(
    config: RouterNodeConfig,
    context: JsonObject
): Promise<JsonObject & { __routeOutputs: string[] }> {
    const { conditions, defaultOutput, evaluationMode } = config;

    if (!Array.isArray(conditions)) {
        throw new Error("RouterNodeConfig.conditions must be an array");
    }

    const matchedOutputs: string[] = [];

    for (const condition of conditions) {
        const expression = condition.expression?.trim();

        if (!condition.name || !expression) continue;

        let result: boolean;

        try {
            result = evaluateExpression(expression, context);
        } catch (err) {
            throw new Error(
                `Router expression failed for "${condition.name}": ${expression}\n${err}`
            );
        }

        if (result) {
            matchedOutputs.push(condition.name);

            if (evaluationMode === "first") break;
        }
    }

    // Fallback route
    if (matchedOutputs.length === 0) {
        matchedOutputs.push(defaultOutput);
    }

    return {
        ...context,
        __routeOutputs: matchedOutputs
    };
}
