import { BaseNodeHandler, NodeHandlerInput, NodeHandlerOutput } from "./types";
import type { JsonObject, JsonValue } from "@flowmaestro/shared";

/**
 * LogicHandler - Handles conditional and routing nodes.
 *
 * Supported node types:
 * - conditional: If/then/else branching
 * - switch: Multi-way branching
 * - router: Dynamic routing based on rules
 * - filter: Filter array items
 * - merge: Merge multiple inputs
 */
export class LogicHandler extends BaseNodeHandler {
    protected nodeTypes = ["conditional", "switch", "router", "filter", "merge"];

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();

        try {
            let result: NodeHandlerOutput;

            switch (input.nodeType) {
                case "conditional":
                    result = await this.executeConditional(input);
                    break;
                case "switch":
                    result = await this.executeSwitch(input);
                    break;
                case "router":
                    result = await this.executeRouter(input);
                    break;
                case "filter":
                    result = await this.executeFilter(input);
                    break;
                case "merge":
                    result = await this.executeMerge(input);
                    break;
                default:
                    result = this.success({ passthrough: true });
            }

            // Add duration metadata
            if (result.metadata) {
                result.metadata.durationMs = Date.now() - startTime;
            } else {
                result.metadata = { durationMs: Date.now() - startTime };
            }

            return result;
        } catch (error) {
            return this.failure(
                error instanceof Error ? error.message : String(error),
                { activateErrorPort: true }
            );
        }
    }

    private async executeConditional(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const condition = config.condition as string;
        const leftValue = config.leftValue;
        const operator = (config.operator as string) || "equals";
        const rightValue = config.rightValue;

        let result: boolean;

        if (condition) {
            // Evaluate expression-based condition
            result = this.evaluateCondition(condition, context);
        } else {
            // Evaluate comparison-based condition
            const left = this.resolveValue(leftValue, context);
            const right = this.resolveValue(rightValue, context);
            result = this.compareValues(left, right, operator);
        }

        return this.route(result ? "true" : "false", {
            condition: result,
            evaluated: result
        });
    }

    private async executeSwitch(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const switchValue = this.resolveValue(config.value, context);
        const cases = (config.cases as Array<{ value: unknown; route: string }>) || [];

        // Find matching case
        for (const caseItem of cases) {
            const caseValue = this.resolveValue(caseItem.value, context);
            if (this.valuesEqual(switchValue, caseValue)) {
                return this.route(caseItem.route, {
                    matched: caseItem.route,
                    value: switchValue as JsonValue
                });
            }
        }

        // Default case
        return this.route("default", {
            matched: "default",
            value: switchValue as JsonValue
        });
    }

    private async executeRouter(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const rules = (config.rules as Array<{
            condition: string;
            route: string;
        }>) || [];

        // Evaluate rules in order
        for (const rule of rules) {
            if (this.evaluateCondition(rule.condition, context)) {
                return this.route(rule.route, {
                    matched: rule.route,
                    condition: rule.condition
                });
            }
        }

        // Default route
        const defaultRoute = (config.defaultRoute as string) || "default";
        return this.route(defaultRoute, {
            matched: defaultRoute,
            reason: "no matching rules"
        });
    }

    private async executeFilter(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const sourceArray = this.resolveValue(config.source, context);
        const filterCondition = config.condition as string;

        if (!Array.isArray(sourceArray)) {
            return this.success({ filtered: [], count: 0 });
        }

        const filtered = sourceArray.filter((item, index) => {
            return this.evaluateItemCondition(filterCondition, item, index, context);
        });

        return this.success({
            filtered: filtered as JsonValue,
            count: filtered.length,
            originalCount: sourceArray.length
        });
    }

    private async executeMerge(
        input: NodeHandlerInput
    ): Promise<NodeHandlerOutput> {
        const { config, context } = input;
        const sources = (config.sources as string[]) || [];
        const strategy = (config.strategy as string) || "object";

        if (strategy === "array") {
            // Merge into array
            const merged: unknown[] = [];
            for (const source of sources) {
                const value = context.nodeOutputs[source];
                if (value !== undefined) {
                    merged.push(value);
                }
            }
            return this.success({ merged: merged as JsonValue });
        }

        // Merge into object (default)
        const merged: JsonObject = {};
        for (const source of sources) {
            const value = context.nodeOutputs[source];
            if (value && typeof value === "object") {
                Object.assign(merged, value);
            }
        }
        return this.success({ merged });
    }

    private evaluateCondition(
        condition: string,
        context: NodeHandlerInput["context"]
    ): boolean {
        try {
            // Create evaluation context
            const evalContext = {
                inputs: context.inputs,
                outputs: context.nodeOutputs,
                variables: context.workflowVariables,
                loop: context.loopContext
            };

            const fn = new Function(
                "ctx",
                `const { inputs, outputs, variables, loop } = ctx; return ${condition}`
            );
            return Boolean(fn(evalContext));
        } catch {
            return false;
        }
    }

    private evaluateItemCondition(
        condition: string,
        item: unknown,
        index: number,
        context: NodeHandlerInput["context"]
    ): boolean {
        try {
            const evalContext = {
                item,
                index,
                inputs: context.inputs,
                outputs: context.nodeOutputs,
                variables: context.workflowVariables
            };

            const fn = new Function(
                "ctx",
                `const { item, index, inputs, outputs, variables } = ctx; return ${condition}`
            );
            return Boolean(fn(evalContext));
        } catch {
            return false;
        }
    }

    private resolveValue(
        value: unknown,
        context: NodeHandlerInput["context"]
    ): unknown {
        if (typeof value !== "string") {
            return value;
        }

        // Check if it's a variable reference
        if (value.startsWith("{{") && value.endsWith("}}")) {
            const path = value.slice(2, -2).trim();
            return this.resolvePath(path, context);
        }

        // Check for direct node reference
        if (value.includes(".")) {
            const parts = value.split(".");
            const nodeId = parts[0];
            if (context.nodeOutputs[nodeId]) {
                return this.getNestedValue(
                    context.nodeOutputs[nodeId],
                    parts.slice(1).join(".")
                );
            }
        }

        return value;
    }

    private resolvePath(
        path: string,
        context: NodeHandlerInput["context"]
    ): unknown {
        const parts = path.split(".");
        const root = parts[0];

        let value: unknown;

        if (root === "inputs") {
            value = context.inputs;
        } else if (root === "variables" || root === "var") {
            value = context.workflowVariables;
        } else if (root === "loop") {
            value = context.loopContext;
        } else if (context.nodeOutputs[root]) {
            value = context.nodeOutputs[root];
        } else {
            return undefined;
        }

        for (let i = 1; i < parts.length && value != null; i++) {
            value = (value as Record<string, unknown>)[parts[i]];
        }

        return value;
    }

    private getNestedValue(obj: JsonObject, path: string): unknown {
        const parts = path.split(".");
        let value: unknown = obj;

        for (const part of parts) {
            if (value == null || typeof value !== "object") {
                return undefined;
            }
            value = (value as Record<string, unknown>)[part];
        }

        return value;
    }

    private compareValues(
        left: unknown,
        right: unknown,
        operator: string
    ): boolean {
        switch (operator) {
            case "equals":
            case "==":
                return this.valuesEqual(left, right);
            case "notEquals":
            case "!=":
                return !this.valuesEqual(left, right);
            case "greaterThan":
            case ">":
                return Number(left) > Number(right);
            case "lessThan":
            case "<":
                return Number(left) < Number(right);
            case "greaterThanOrEquals":
            case ">=":
                return Number(left) >= Number(right);
            case "lessThanOrEquals":
            case "<=":
                return Number(left) <= Number(right);
            case "contains":
                return String(left).includes(String(right));
            case "startsWith":
                return String(left).startsWith(String(right));
            case "endsWith":
                return String(left).endsWith(String(right));
            case "isEmpty":
                return (
                    left === null ||
                    left === undefined ||
                    left === "" ||
                    (Array.isArray(left) && left.length === 0)
                );
            case "isNotEmpty":
                return !(
                    left === null ||
                    left === undefined ||
                    left === "" ||
                    (Array.isArray(left) && left.length === 0)
                );
            default:
                return this.valuesEqual(left, right);
        }
    }

    private valuesEqual(a: unknown, b: unknown): boolean {
        if (a === b) return true;
        if (typeof a !== typeof b) return String(a) === String(b);
        if (typeof a === "object" && a !== null && b !== null) {
            return JSON.stringify(a) === JSON.stringify(b);
        }
        return false;
    }
}
