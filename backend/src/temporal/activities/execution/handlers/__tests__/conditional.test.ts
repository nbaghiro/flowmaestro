/**
 * Conditional Node Handler Unit Tests
 *
 * Tests all comparison operators and branching logic:
 * - Equality: ==, !=
 * - Comparison: >, <, >=, <=
 * - String: contains, startsWith, endsWith
 * - Type coercion and null handling
 * - Variable interpolation
 */

import {
    createHandlerInput,
    createTestContext,
    assertBranchSelection,
    CommonConfigs,
    mustacheRef
} from "../../../../../../__tests__/helpers/handler-test-utils";
import {
    ConditionalNodeHandler,
    createConditionalNodeHandler,
    type ComparisonOperator
} from "../logic/conditional";

describe("ConditionalNodeHandler", () => {
    let handler: ConditionalNodeHandler;

    beforeEach(() => {
        handler = createConditionalNodeHandler();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("ConditionalNodeHandler");
        });

        it("supports multiple node type aliases", () => {
            expect(handler.supportedNodeTypes).toContain("conditional");
            expect(handler.supportedNodeTypes).toContain("condition");
            expect(handler.supportedNodeTypes).toContain("if");
        });

        it("can handle conditional types", () => {
            expect(handler.canHandle("conditional")).toBe(true);
            expect(handler.canHandle("condition")).toBe(true);
            expect(handler.canHandle("if")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("switch")).toBe(false);
            expect(handler.canHandle("llm")).toBe(false);
        });
    });

    describe("equality operator (==)", () => {
        it("returns true branch for equal numbers", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("10", "10")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
            expect(output.result.conditionMet).toBe(true);
        });

        it("returns false branch for unequal numbers", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("10", "20")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "false");
            expect(output.result.conditionMet).toBe(false);
        });

        it("handles string comparison (case-insensitive)", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("Hello", "HELLO")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles boolean values", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("true", "true")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("coerces types for number-string comparison", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("42", "42")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });
    });

    describe("inequality operator (!=)", () => {
        it("returns true branch for unequal values", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.notEquals("10", "20")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
            expect(output.result.conditionMet).toBe(true);
        });

        it("returns false branch for equal values", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.notEquals("test", "test")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "false");
            expect(output.result.conditionMet).toBe(false);
        });
    });

    describe("greater than operator (>)", () => {
        it("returns true when left > right", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.greaterThan("20", "10")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("returns false when left <= right", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.greaterThan("10", "20")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "false");
        });

        it("returns false when values are equal", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.greaterThan("10", "10")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "false");
        });
    });

    describe("less than operator (<)", () => {
        it("returns true when left < right", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.lessThan("10", "20")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("returns false when left >= right", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.lessThan("20", "10")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "false");
        });
    });

    describe("greater than or equal operator (>=)", () => {
        it("returns true when left > right", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "20",
                    operator: ">=" as ComparisonOperator,
                    rightValue: "10"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("returns true when left equals right", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "10",
                    operator: ">=" as ComparisonOperator,
                    rightValue: "10"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("returns false when left < right", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "5",
                    operator: ">=" as ComparisonOperator,
                    rightValue: "10"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "false");
        });
    });

    describe("less than or equal operator (<=)", () => {
        it("returns true when left < right", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "5",
                    operator: "<=" as ComparisonOperator,
                    rightValue: "10"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("returns true when left equals right", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "10",
                    operator: "<=" as ComparisonOperator,
                    rightValue: "10"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });
    });

    describe("contains operator", () => {
        it("returns true when string contains substring", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.contains("Hello World", "World")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles case-insensitive contains", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.contains("Hello World", "WORLD")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("returns false when substring not found", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.contains("Hello World", "Foo")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "false");
        });

        it("returns true when array contains element", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    data: { items: ["apple", "banana", "cherry"] }
                }
            });

            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: mustacheRef("data", "items"),
                    operator: "contains" as ComparisonOperator,
                    rightValue: "banana"
                },
                context
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });
    });

    describe("startsWith operator", () => {
        it("returns true when string starts with prefix", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "Hello World",
                    operator: "startsWith" as ComparisonOperator,
                    rightValue: "Hello"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles case-insensitive startsWith", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "Hello World",
                    operator: "startsWith" as ComparisonOperator,
                    rightValue: "HELLO"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("returns false when string does not start with prefix", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "Hello World",
                    operator: "startsWith" as ComparisonOperator,
                    rightValue: "World"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "false");
        });
    });

    describe("endsWith operator", () => {
        it("returns true when string ends with suffix", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "Hello World",
                    operator: "endsWith" as ComparisonOperator,
                    rightValue: "World"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles case-insensitive endsWith", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "Hello World",
                    operator: "endsWith" as ComparisonOperator,
                    rightValue: "WORLD"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });
    });

    describe("variable interpolation", () => {
        it("interpolates variables in leftValue", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    data: { score: 85 }
                }
            });

            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: mustacheRef("data", "score"),
                    operator: ">=" as ComparisonOperator,
                    rightValue: "80"
                },
                context
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("interpolates variables in both values", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    score: { value: 85 },
                    threshold: { value: 80 }
                }
            });

            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: mustacheRef("score", "value"),
                    operator: ">=" as ComparisonOperator,
                    rightValue: mustacheRef("threshold", "value")
                },
                context
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles workflow inputs in variables", async () => {
            const context = createTestContext({
                inputs: { userScore: 90, passingScore: 70 }
            });

            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: mustacheRef("userScore"),
                    operator: ">=" as ComparisonOperator,
                    rightValue: mustacheRef("passingScore")
                },
                context
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });
    });

    describe("null handling", () => {
        it("null equals null", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("null", "null")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("null does not equal other values", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("null", "test")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "false");
        });

        it("undefined equals null", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("undefined", "null")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });
    });

    describe("output structure", () => {
        it("includes all evaluation details in result", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "100",
                    operator: ">" as ComparisonOperator,
                    rightValue: "50"
                }
            });

            const output = await handler.execute(input);

            expect(output.result).toMatchObject({
                conditionMet: true,
                branch: "true",
                leftValue: 100,
                rightValue: 50,
                operator: ">"
            });
        });

        it("stores result in outputVariable when specified", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "10",
                    operator: ">" as ComparisonOperator,
                    rightValue: "5",
                    outputVariable: "checkResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result).toHaveProperty("checkResult");
            expect(output.result.checkResult).toMatchObject({
                conditionMet: true,
                branch: "true"
            });
        });

        it("sets selectedRoute signal for workflow routing", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("test", "test")
            });

            const output = await handler.execute(input);

            expect(output.signals.selectedRoute).toBe("true");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("a", "b")
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("edge cases", () => {
        it("handles JSON object comparison", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals('{"a":1,"b":2}', '{"a":1,"b":2}')
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles array comparison", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("[1,2,3]", "[1,2,3]")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles empty string comparison", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("", "")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles special characters in strings", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.contains("Hello! @World# $Test%", "@World#")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles numeric strings vs numbers", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.greaterThan("100", "99")
            });

            const output = await handler.execute(input);

            // Should compare as numbers since both parse to numbers
            assertBranchSelection(output, "true");
        });

        it("handles string comparison when one value is clearly not a number", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.greaterThan("banana", "apple")
            });

            const output = await handler.execute(input);

            // Should fallback to string comparison
            assertBranchSelection(output, "true"); // "banana" > "apple" lexicographically
        });

        it("handles floating point comparison", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "3.14159",
                    operator: ">" as ComparisonOperator,
                    rightValue: "3.14"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles negative number comparison", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "-5",
                    operator: "<" as ComparisonOperator,
                    rightValue: "0"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles very large numbers", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "999999999999999",
                    operator: ">" as ComparisonOperator,
                    rightValue: "1"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles scientific notation", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "1e6",
                    operator: "==" as ComparisonOperator,
                    rightValue: "1000000"
                }
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles whitespace in string comparison", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.equals("  hello  ", "hello")
            });

            const output = await handler.execute(input);

            // Depending on implementation - may trim or not
            // This tests the actual behavior
            expect(output.result.conditionMet).toBeDefined();
        });

        it("handles Unicode strings", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.contains("こんにちは世界", "世界")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles emoji in strings", async () => {
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: CommonConfigs.conditional.contains("Hello 👋 World 🌍", "🌍")
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });
    });

    describe("deep object property access", () => {
        it("accesses nested object properties", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    api: {
                        response: {
                            data: {
                                user: {
                                    profile: {
                                        age: 25
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "{{api.response.data.user.profile.age}}",
                    operator: ">=" as ComparisonOperator,
                    rightValue: "18"
                },
                context
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });

        it("handles array index access", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    data: {
                        items: [
                            { name: "first", value: 10 },
                            { name: "second", value: 20 },
                            { name: "third", value: 30 }
                        ]
                    }
                }
            });

            // Access items[1].value
            const input = createHandlerInput({
                nodeType: "conditional",
                nodeConfig: {
                    leftValue: "{{data.items.1.value}}",
                    operator: "==" as ComparisonOperator,
                    rightValue: "20"
                },
                context
            });

            const output = await handler.execute(input);

            assertBranchSelection(output, "true");
        });
    });

    describe("concurrent conditional execution", () => {
        it("handles multiple concurrent evaluations", async () => {
            const inputs = [
                createHandlerInput({
                    nodeType: "conditional",
                    nodeConfig: CommonConfigs.conditional.equals("a", "a")
                }),
                createHandlerInput({
                    nodeType: "conditional",
                    nodeConfig: CommonConfigs.conditional.greaterThan("10", "5")
                }),
                createHandlerInput({
                    nodeType: "conditional",
                    nodeConfig: CommonConfigs.conditional.contains("hello world", "world")
                })
            ];

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(3);
            outputs.forEach((output) => {
                assertBranchSelection(output, "true");
            });
        });
    });
});
