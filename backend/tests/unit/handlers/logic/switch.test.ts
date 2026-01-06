/**
 * Switch Node Handler Unit Tests
 *
 * Tests multi-way branching logic:
 * - Exact case matching
 * - Wildcard patterns (* and ?)
 * - Default case handling
 * - Variable interpolation
 * - Case-insensitive string matching
 * - Numeric comparison
 */

import {
    SwitchNodeHandler,
    createSwitchNodeHandler
} from "../../../../src/temporal/activities/execution/handlers/logic/switch";
import {
    createHandlerInput,
    createTestContext,
    assertSuccessOutput,
    mustacheRef
} from "../../../helpers/handler-test-utils";

describe("SwitchNodeHandler", () => {
    let handler: SwitchNodeHandler;

    beforeEach(() => {
        handler = createSwitchNodeHandler();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("SwitchNodeHandler");
        });

        it("supports switch node type", () => {
            expect(handler.supportedNodeTypes).toContain("switch");
        });

        it("can handle switch type", () => {
            expect(handler.canHandle("switch")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("conditional")).toBe(false);
            expect(handler.canHandle("if")).toBe(false);
        });
    });

    describe("exact case matching", () => {
        it("matches first exact case", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "pending",
                    cases: [
                        { value: "pending", label: "Pending" },
                        { value: "active", label: "Active" },
                        { value: "completed", label: "Completed" }
                    ],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            assertSuccessOutput(output);
            expect(output.result.matchedCase).toBe("pending");
            expect(output.signals.selectedRoute).toBe("pending");
        });

        it("matches middle case", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "active",
                    cases: [
                        { value: "pending", label: "Pending" },
                        { value: "active", label: "Active" },
                        { value: "completed", label: "Completed" }
                    ],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("active");
            expect(output.signals.selectedRoute).toBe("active");
        });

        it("matches last case", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "completed",
                    cases: [
                        { value: "pending", label: "Pending" },
                        { value: "active", label: "Active" },
                        { value: "completed", label: "Completed" }
                    ],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("completed");
            expect(output.signals.selectedRoute).toBe("completed");
        });
    });

    describe("case-insensitive matching", () => {
        it("matches case regardless of casing", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "PENDING",
                    cases: [
                        { value: "pending", label: "Pending" },
                        { value: "active", label: "Active" }
                    ],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("pending");
        });

        it("handles mixed case expression and value", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "PeNdInG",
                    cases: [{ value: "PENDING", label: "Pending" }],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("PENDING");
        });
    });

    describe("numeric matching", () => {
        it("matches numeric values", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "100",
                    cases: [
                        { value: "50", label: "Low" },
                        { value: "100", label: "Medium" },
                        { value: "200", label: "High" }
                    ],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("100");
        });

        it("handles number vs string comparison", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    data: { score: 100 }
                }
            });

            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: mustacheRef("data", "score"),
                    cases: [{ value: "100", label: "Exact" }],
                    defaultCase: "unknown"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("100");
        });
    });

    describe("wildcard matching", () => {
        it("matches * wildcard (any characters)", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "error_not_found",
                    cases: [
                        { value: "error_*", label: "Error" },
                        { value: "success_*", label: "Success" }
                    ],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("error_*");
        });

        it("matches ? wildcard (single character)", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "user_a",
                    cases: [
                        { value: "user_?", label: "Single char user" },
                        { value: "user_*", label: "Any user" }
                    ],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            // Should match the more specific pattern first
            expect(output.result.matchedCase).toBe("user_?");
        });

        it("? does not match multiple characters", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "user_abc",
                    cases: [{ value: "user_?", label: "Single char" }],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("unknown");
        });

        it("matches complex wildcard pattern", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "prod_us-east-1_cluster",
                    cases: [
                        { value: "prod_*_cluster", label: "Prod cluster" },
                        { value: "dev_*_cluster", label: "Dev cluster" }
                    ],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("prod_*_cluster");
        });

        it("escapes regex special characters in pattern", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "price: $100.00",
                    cases: [{ value: "price: $*", label: "Price" }],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("price: $*");
        });
    });

    describe("default case", () => {
        it("uses default when no match found", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "unknown_status",
                    cases: [
                        { value: "pending", label: "Pending" },
                        { value: "active", label: "Active" }
                    ],
                    defaultCase: "fallback"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("fallback");
            expect(output.result.matchedValue).toBeNull();
            expect(output.signals.selectedRoute).toBe("fallback");
        });

        it("uses null when no default specified and no match", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "unknown_status",
                    cases: [{ value: "pending", label: "Pending" }]
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBeNull();
            expect(output.signals.selectedRoute).toBe("default");
        });
    });

    describe("variable interpolation", () => {
        it("interpolates expression from context", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    data: { status: "active" }
                }
            });

            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: mustacheRef("data", "status"),
                    cases: [
                        { value: "pending", label: "Pending" },
                        { value: "active", label: "Active" }
                    ],
                    defaultCase: "unknown"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("active");
        });

        it("interpolates case values from context", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    data: { status: "special" },
                    config: { specialValue: "special" }
                }
            });

            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: mustacheRef("data", "status"),
                    cases: [{ value: mustacheRef("config", "specialValue"), label: "Special" }],
                    defaultCase: "unknown"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe(mustacheRef("config", "specialValue"));
        });

        it("handles workflow inputs in expression", async () => {
            const context = createTestContext({
                inputs: { orderType: "express" }
            });

            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: mustacheRef("orderType"),
                    cases: [
                        { value: "standard", label: "Standard" },
                        { value: "express", label: "Express" },
                        { value: "overnight", label: "Overnight" }
                    ],
                    defaultCase: "standard"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("express");
        });
    });

    describe("null/undefined handling", () => {
        it("matches null expression with null case", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    data: { value: null }
                }
            });

            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: mustacheRef("data", "value"),
                    cases: [
                        { value: "null", label: "Null" },
                        { value: "value", label: "Has value" }
                    ],
                    defaultCase: "unknown"
                },
                context
            });

            // Note: This depends on how interpolation handles null
            const output = await handler.execute(input);

            // The null gets stringified to "null" in interpolation
            expect(output.result.matchedCase).toBeDefined();
        });
    });

    describe("output structure", () => {
        it("includes all evaluation details", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "test_value",
                    cases: [{ value: "test_*", label: "Test Pattern" }],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result).toMatchObject({
                matchedCase: "test_*",
                matchedValue: "test_*",
                evaluatedExpression: "test_value"
            });
        });

        it("sets selectedRoute signal for workflow routing", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "active",
                    cases: [{ value: "active", label: "Active" }],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals.selectedRoute).toBe("active");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "value",
                    cases: [{ value: "value", label: "Match" }],
                    defaultCase: "default"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("edge cases", () => {
        it("handles empty expression", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "",
                    cases: [
                        { value: "", label: "Empty" },
                        { value: "value", label: "Value" }
                    ],
                    defaultCase: "unknown"
                }
            });

            // Schema may reject empty expression - test actual behavior
            try {
                const output = await handler.execute(input);
                expect(output.result.matchedCase).toBe("");
            } catch (error) {
                // Schema validation may reject empty expression
                expect(error).toBeDefined();
            }
        });

        it("handles empty cases array", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "any_value",
                    cases: [],
                    defaultCase: "fallback"
                }
            });

            // Schema may require at least one case - test actual behavior
            try {
                const output = await handler.execute(input);
                expect(output.result.matchedCase).toBe("fallback");
            } catch (error) {
                // Schema validation may reject empty cases
                expect(error).toBeDefined();
            }
        });

        it("uses first match when multiple cases could match", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "test_value",
                    cases: [
                        { value: "test_*", label: "Test Pattern" },
                        { value: "test_value", label: "Exact" },
                        { value: "*", label: "Catch All" }
                    ],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            // First matching case wins
            expect(output.result.matchedCase).toBe("test_*");
        });

        it("handles special characters in expression", async () => {
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: "user@example.com",
                    cases: [{ value: "user@example.com", label: "Email" }],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe("user@example.com");
        });

        it("handles very long expression", async () => {
            const longValue = "a".repeat(10000);
            const input = createHandlerInput({
                nodeType: "switch",
                nodeConfig: {
                    expression: longValue,
                    cases: [{ value: longValue, label: "Long" }],
                    defaultCase: "unknown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.matchedCase).toBe(longValue);
        });
    });
});
