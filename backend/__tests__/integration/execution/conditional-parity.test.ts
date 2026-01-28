/**
 * Conditional Handler vs Orchestrator Parity Tests
 *
 * These tests verify that the conditional handler and the workflow orchestrator's
 * inline conditional evaluation produce the same results for all operators.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { executeConditionalNode } from "../../../src/temporal/activities/execution/handlers/logic/conditional";

// Helper types and functions (copied from workflow-orchestrator.ts)
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function parseValue(value: string): JsonValue {
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== "") return num;
    const lower = value.toLowerCase().trim();
    if (lower === "true") return true;
    if (lower === "false") return false;
    if (lower === "null" || lower === "undefined") return null;
    if (
        (value.trim().startsWith("{") && value.trim().endsWith("}")) ||
        (value.trim().startsWith("[") && value.trim().endsWith("]"))
    ) {
        try {
            return JSON.parse(value);
        } catch {
            /* not JSON */
        }
    }
    return value;
}

function condEquals(left: JsonValue, right: JsonValue): boolean {
    if (left === null) return right === null;
    if (typeof left === "number" || typeof right === "number")
        return Number(left) === Number(right);
    if (typeof left === "string" || typeof right === "string")
        return String(left).toLowerCase() === String(right).toLowerCase();
    if (typeof left === "boolean" || typeof right === "boolean")
        return Boolean(left) === Boolean(right);
    return JSON.stringify(left) === JSON.stringify(right);
}

function condCompare(left: JsonValue, right: JsonValue): number {
    const leftNum = Number(left);
    const rightNum = Number(right);
    if (isNaN(leftNum) || isNaN(rightNum)) return String(left).localeCompare(String(right));
    return leftNum - rightNum;
}

function condContains(value: JsonValue, searchValue: JsonValue): boolean {
    if (typeof value === "string")
        return value.toLowerCase().includes(String(searchValue).toLowerCase());
    if (Array.isArray(value)) return value.some((item) => condEquals(item, searchValue));
    return false;
}

function evaluateCondition(left: JsonValue, operator: string, right: JsonValue): boolean {
    switch (operator) {
        case "==":
            return condEquals(left, right);
        case "!=":
            return !condEquals(left, right);
        case ">":
            return condCompare(left, right) > 0;
        case "<":
            return condCompare(left, right) < 0;
        case ">=":
            return condCompare(left, right) >= 0;
        case "<=":
            return condCompare(left, right) <= 0;
        case "contains":
            return condContains(left, right);
        case "startsWith":
            return String(left).toLowerCase().startsWith(String(right).toLowerCase());
        case "endsWith":
            return String(left).toLowerCase().endsWith(String(right).toLowerCase());
        default:
            return condEquals(left, right);
    }
}

/**
 * COPY of evaluateConditionalNode from workflow-orchestrator.ts (FIXED VERSION)
 * We need to copy this because it's not exported from the workflow module
 */
function orchestratorEvaluateConditional(
    config: { leftValue: string; operator: string; rightValue: string },
    context: JsonObject
): { conditionMet: boolean; branch: string } {
    const leftValue = config.leftValue || "";
    const rightValue = config.rightValue || "";
    const operator = config.operator || "==";

    // Variable interpolation
    const interpolate = (str: string): string => {
        return str.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const value = context[key.trim()];
            return value !== undefined ? String(value) : "";
        });
    };

    const leftInterpolated = interpolate(leftValue);
    const rightInterpolated = interpolate(rightValue);

    const leftParsed = parseValue(leftInterpolated);
    const rightParsed = parseValue(rightInterpolated);

    const conditionMet = evaluateCondition(leftParsed, operator, rightParsed);
    const branch = conditionMet ? "true" : "false";

    return { conditionMet, branch };
}

describe("Conditional Handler vs Orchestrator Parity", () => {
    const testCases = [
        // Equality
        {
            name: "equal strings",
            config: { leftValue: "hello", operator: "==" as const, rightValue: "hello" },
            expected: true
        },
        {
            name: "equal strings case-insensitive",
            config: { leftValue: "Hello", operator: "==" as const, rightValue: "HELLO" },
            expected: true
        },
        {
            name: "unequal strings with ==",
            config: { leftValue: "hello", operator: "==" as const, rightValue: "world" },
            expected: false
        },

        // Inequality
        {
            name: "unequal strings with !=",
            config: { leftValue: "hello", operator: "!=" as const, rightValue: "world" },
            expected: true
        },
        {
            name: "equal strings with !=",
            config: { leftValue: "hello", operator: "!=" as const, rightValue: "hello" },
            expected: false
        },

        // Numeric comparison
        {
            name: "10 > 5",
            config: { leftValue: "10", operator: ">" as const, rightValue: "5" },
            expected: true
        },
        {
            name: "5 > 10",
            config: { leftValue: "5", operator: ">" as const, rightValue: "10" },
            expected: false
        },
        {
            name: "5 < 10",
            config: { leftValue: "5", operator: "<" as const, rightValue: "10" },
            expected: true
        },
        {
            name: "10 >= 10",
            config: { leftValue: "10", operator: ">=" as const, rightValue: "10" },
            expected: true
        },
        {
            name: "11 >= 10",
            config: { leftValue: "11", operator: ">=" as const, rightValue: "10" },
            expected: true
        },

        // String operations
        {
            name: "contains substring",
            config: {
                leftValue: "hello world",
                operator: "contains" as const,
                rightValue: "world"
            },
            expected: true
        },
        {
            name: "does not contain substring",
            config: { leftValue: "hello world", operator: "contains" as const, rightValue: "foo" },
            expected: false
        },
        {
            name: "startsWith",
            config: {
                leftValue: "hello world",
                operator: "startsWith" as const,
                rightValue: "hello"
            },
            expected: true
        },
        {
            name: "endsWith",
            config: {
                leftValue: "hello world",
                operator: "endsWith" as const,
                rightValue: "world"
            },
            expected: true
        }
    ];

    describe("Handler behavior", () => {
        for (const tc of testCases) {
            it(`should handle ${tc.name}`, async () => {
                const result = await executeConditionalNode(tc.config, {});
                expect(result.conditionMet).toBe(tc.expected);
            });
        }
    });

    describe("Orchestrator behavior", () => {
        for (const tc of testCases) {
            it(`should handle ${tc.name}`, () => {
                const result = orchestratorEvaluateConditional(tc.config, {});
                expect(result.conditionMet).toBe(tc.expected);
            });
        }
    });

    describe("PARITY CHECK: Handler vs Orchestrator", () => {
        for (const tc of testCases) {
            it(`should match for ${tc.name}`, async () => {
                const handlerResult = await executeConditionalNode(tc.config, {});
                const orchestratorResult = orchestratorEvaluateConditional(tc.config, {});

                expect(orchestratorResult.conditionMet).toBe(handlerResult.conditionMet);
            });
        }
    });

    describe("With variable interpolation", () => {
        it("handler should interpolate variables correctly", async () => {
            const config = { leftValue: "{{score}}", operator: ">" as const, rightValue: "50" };
            const context = { score: 75 };
            const result = await executeConditionalNode(config, context);
            expect(result.conditionMet).toBe(true);
        });

        it("orchestrator should match handler with interpolation", async () => {
            const config = { leftValue: "{{score}}", operator: ">" as const, rightValue: "50" };
            const context = { score: 75 };

            const handlerResult = await executeConditionalNode(config, context);
            const orchestratorResult = orchestratorEvaluateConditional(config, context);

            expect(orchestratorResult.conditionMet).toBe(handlerResult.conditionMet);
        });
    });
});
