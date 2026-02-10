/**
 * Node Evaluators Unit Tests
 *
 * Tests for pure evaluation functions used by the workflow orchestrator.
 * These functions evaluate conditional and loop nodes synchronously
 * (inline) rather than dispatching to activity handlers.
 *
 * These tests exist to:
 * 1. Verify correct behavior of node evaluation functions
 * 2. Catch regressions if the evaluation logic changes
 * 3. Ensure parity with corresponding handlers
 */

import type { JsonObject } from "@flowmaestro/shared";

// We need to test the inline functions directly
// Since they're not exported, we'll need to extract or duplicate the logic for testing
// This highlights the architectural issue - these should be using the handlers

interface ExecutableNode {
    type: string;
    config: JsonObject;
}

// Helper functions copied from workflow-orchestrator.ts (after fix)
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
 */
function evaluateConditionalNode(node: ExecutableNode, context: JsonObject): JsonObject {
    const leftValue = typeof node.config.leftValue === "string" ? node.config.leftValue : "";
    const rightValue = typeof node.config.rightValue === "string" ? node.config.rightValue : "";
    const operator = typeof node.config.operator === "string" ? node.config.operator : "==";

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

    return {
        conditionMet,
        branch,
        leftValue: leftInterpolated,
        rightValue: rightInterpolated,
        operator
    };
}

/**
 * EXACT COPY of evaluateLoopStart from workflow-orchestrator.ts
 */
function evaluateLoopStart(node: ExecutableNode, context: JsonObject): JsonObject {
    const loopType = (node.config.loopType as string) || "forEach";
    const arrayPath = node.config.arrayPath as string | undefined;
    const count = node.config.count as number | undefined;
    const iterationVar = (node.config.iterationVariable as string) || "index";
    const currentIteration = (context[iterationVar] as number) || 0;

    let shouldContinue = false;
    let total = 0;
    let item: JsonValue = null;

    switch (loopType) {
        case "forEach": {
            const arrayValue = arrayPath ? context[arrayPath.replace(/^\{\{|\}\}$/g, "")] : [];
            const array = Array.isArray(arrayValue) ? arrayValue : [];
            total = array.length;
            shouldContinue = currentIteration < total;
            item = shouldContinue ? array[currentIteration] : null;
            break;
        }
        case "count": {
            total = count || 0;
            shouldContinue = currentIteration < total;
            break;
        }
        case "while": {
            shouldContinue = currentIteration < ((node.config.maxIterations as number) || 1000);
            break;
        }
    }

    return {
        continue: shouldContinue,
        iteration: currentIteration,
        item,
        total,
        loopType
    };
}

describe("Workflow Orchestrator Inline Functions", () => {
    describe("evaluateConditionalNode", () => {
        describe("equality operator (==)", () => {
            it("should return true when values are equal", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "hello", operator: "==", rightValue: "hello" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
                expect(result.branch).toBe("true");
            });

            it("should be case-insensitive", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "Hello", operator: "==", rightValue: "HELLO" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return false when values are different", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "hello", operator: "==", rightValue: "world" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(false);
                expect(result.branch).toBe("false");
            });
        });

        describe("variable interpolation", () => {
            it("should interpolate variables in leftValue", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "{{name}}", operator: "==", rightValue: "John" }
                };
                const result = evaluateConditionalNode(node, { name: "John" });
                expect(result.conditionMet).toBe(true);
                expect(result.leftValue).toBe("John");
            });

            it("should interpolate variables in rightValue", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "John", operator: "==", rightValue: "{{name}}" }
                };
                const result = evaluateConditionalNode(node, { name: "John" });
                expect(result.conditionMet).toBe(true);
            });

            it("should handle missing variables as empty string", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "{{missing}}", operator: "==", rightValue: "" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
                expect(result.leftValue).toBe("");
            });
        });

        describe("inequality operator (!=)", () => {
            it("should return true when values are different", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "hello", operator: "!=", rightValue: "world" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return false when values are equal", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "hello", operator: "!=", rightValue: "hello" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(false);
            });
        });

        describe("greater than operator (>)", () => {
            it("should return true when left > right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "10", operator: ">", rightValue: "5" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return false when left <= right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "5", operator: ">", rightValue: "10" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(false);
            });
        });

        describe("less than operator (<)", () => {
            it("should return true when left < right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "5", operator: "<", rightValue: "10" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return false when left >= right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "10", operator: "<", rightValue: "5" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(false);
            });
        });

        describe("greater than or equal operator (>=)", () => {
            it("should return true when left > right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "10", operator: ">=", rightValue: "5" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return true when left equals right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "10", operator: ">=", rightValue: "10" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return false when left < right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "5", operator: ">=", rightValue: "10" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(false);
            });
        });

        describe("less than or equal operator (<=)", () => {
            it("should return true when left < right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "5", operator: "<=", rightValue: "10" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return true when left equals right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "10", operator: "<=", rightValue: "10" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return false when left > right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "10", operator: "<=", rightValue: "5" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(false);
            });
        });

        describe("contains operator", () => {
            it("should return true when left contains right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "hello world", operator: "contains", rightValue: "world" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return false when left does not contain right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "hello world", operator: "contains", rightValue: "foo" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(false);
            });
        });

        describe("startsWith operator", () => {
            it("should return true when left starts with right", () => {
                const node = {
                    type: "conditional",
                    config: {
                        leftValue: "hello world",
                        operator: "startsWith",
                        rightValue: "hello"
                    }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return false when left does not start with right", () => {
                const node = {
                    type: "conditional",
                    config: {
                        leftValue: "hello world",
                        operator: "startsWith",
                        rightValue: "world"
                    }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(false);
            });
        });

        describe("endsWith operator", () => {
            it("should return true when left ends with right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "hello world", operator: "endsWith", rightValue: "world" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(true);
            });

            it("should return false when left does not end with right", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "hello world", operator: "endsWith", rightValue: "hello" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.conditionMet).toBe(false);
            });
        });

        describe("output structure", () => {
            it("should include all expected fields", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "a", operator: "==", rightValue: "b" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result).toHaveProperty("conditionMet");
                expect(result).toHaveProperty("branch");
                expect(result).toHaveProperty("leftValue");
                expect(result).toHaveProperty("rightValue");
                expect(result).toHaveProperty("operator");
            });

            it("should include operator in output", () => {
                const node = {
                    type: "conditional",
                    config: { leftValue: "a", operator: ">", rightValue: "b" }
                };
                const result = evaluateConditionalNode(node, {});
                expect(result.operator).toBe(">");
            });
        });
    });

    describe("evaluateLoopStart", () => {
        describe("forEach loop type", () => {
            it("should continue when array has more items", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "forEach", arrayPath: "{{items}}", iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { items: [1, 2, 3], i: 0 });
                expect(result.continue).toBe(true);
                expect(result.item).toBe(1);
                expect(result.total).toBe(3);
            });

            it("should return current item based on iteration", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "forEach", arrayPath: "{{items}}", iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { items: ["a", "b", "c"], i: 1 });
                expect(result.item).toBe("b");
            });

            it("should stop when iteration reaches array length", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "forEach", arrayPath: "{{items}}", iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { items: [1, 2, 3], i: 3 });
                expect(result.continue).toBe(false);
                expect(result.item).toBe(null);
            });

            it("should handle empty array", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "forEach", arrayPath: "{{items}}", iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { items: [], i: 0 });
                expect(result.continue).toBe(false);
                expect(result.total).toBe(0);
            });

            it("should handle missing array as empty", () => {
                const node = {
                    type: "loop-start",
                    config: {
                        loopType: "forEach",
                        arrayPath: "{{missing}}",
                        iterationVariable: "i"
                    }
                };
                const result = evaluateLoopStart(node, { i: 0 });
                expect(result.continue).toBe(false);
                expect(result.total).toBe(0);
            });

            it("should handle non-array value as empty array", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "forEach", arrayPath: "{{items}}", iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { items: "not an array", i: 0 });
                expect(result.continue).toBe(false);
                expect(result.total).toBe(0);
            });
        });

        describe("count loop type", () => {
            it("should continue while iteration < count", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "count", count: 5, iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { i: 2 });
                expect(result.continue).toBe(true);
                expect(result.total).toBe(5);
            });

            it("should stop when iteration reaches count", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "count", count: 5, iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { i: 5 });
                expect(result.continue).toBe(false);
            });

            it("should handle count of 0", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "count", count: 0, iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { i: 0 });
                expect(result.continue).toBe(false);
            });

            it("should handle missing count as 0", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "count", iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { i: 0 });
                expect(result.continue).toBe(false);
                expect(result.total).toBe(0);
            });
        });

        describe("while loop type", () => {
            it("should continue up to maxIterations", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "while", maxIterations: 100, iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { i: 50 });
                expect(result.continue).toBe(true);
            });

            it("should stop at maxIterations", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "while", maxIterations: 100, iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { i: 100 });
                expect(result.continue).toBe(false);
            });

            it("should default to 1000 maxIterations", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "while", iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { i: 999 });
                expect(result.continue).toBe(true);
            });

            it("should stop at default maxIterations", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "while", iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, { i: 1000 });
                expect(result.continue).toBe(false);
            });
        });

        describe("iteration variable", () => {
            it("should use custom iteration variable name", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "count", count: 5, iterationVariable: "myIndex" }
                };
                const result = evaluateLoopStart(node, { myIndex: 3 });
                expect(result.iteration).toBe(3);
            });

            it("should default to 'index' as iteration variable", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "count", count: 5 }
                };
                const result = evaluateLoopStart(node, { index: 2 });
                expect(result.iteration).toBe(2);
            });

            it("should default iteration to 0 if variable missing", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "count", count: 5, iterationVariable: "i" }
                };
                const result = evaluateLoopStart(node, {});
                expect(result.iteration).toBe(0);
            });
        });

        describe("output structure", () => {
            it("should include all expected fields", () => {
                const node = {
                    type: "loop-start",
                    config: { loopType: "forEach", arrayPath: "{{items}}" }
                };
                const result = evaluateLoopStart(node, { items: [1] });
                expect(result).toHaveProperty("continue");
                expect(result).toHaveProperty("iteration");
                expect(result).toHaveProperty("item");
                expect(result).toHaveProperty("total");
                expect(result).toHaveProperty("loopType");
            });
        });
    });
});
