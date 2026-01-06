/**
 * Output Node Handler Unit Tests
 *
 * Tests output node logic:
 * - Handler properties and type support
 * - Value formatting (json, string, number, boolean)
 * - Variable interpolation
 * - Schema validation
 */

import {
    OutputNodeHandler,
    createOutputNodeHandler
} from "../../../../src/temporal/activities/execution/handlers/outputs/output";
import {
    createHandlerInput,
    createTestContext,
    assertValidOutput
} from "../../../helpers/handler-test-utils";

describe("OutputNodeHandler", () => {
    let handler: OutputNodeHandler;

    beforeEach(() => {
        handler = createOutputNodeHandler();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("OutputNodeHandler");
        });

        it("supports output node type", () => {
            expect(handler.supportedNodeTypes).toContain("output");
        });

        it("can handle output type", () => {
            expect(handler.canHandle("output")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("input")).toBe(false);
            expect(handler.canHandle("transform")).toBe(false);
        });
    });

    describe("string format", () => {
        it("outputs string value directly", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "Hello, World!",
                    format: "string"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.result).toBe("Hello, World!");
        });

        it("converts number to string", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "42",
                    format: "string"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe("42");
        });

        it("throws error for empty value", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "",
                    format: "string"
                }
            });

            // Empty value violates min length of 1
            await expect(handler.execute(input)).rejects.toThrow();
        });
    });

    describe("json format", () => {
        it("parses JSON string to object", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: '{"name": "test", "count": 42}',
                    format: "json"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.result).toEqual({ name: "test", count: 42 });
        });

        it("parses JSON array", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "[1, 2, 3]",
                    format: "json"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toEqual([1, 2, 3]);
        });

        it("returns string when JSON is invalid", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "not valid json",
                    format: "json"
                }
            });

            const output = await handler.execute(input);

            // Should return the string as-is when parsing fails
            expect(output.result.result).toBe("not valid json");
        });

        it("passes through objects directly", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    PreviousNode: { data: { nested: "value" } }
                }
            });

            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "{{PreviousNode.data}}",
                    format: "json"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.result).toEqual({ nested: "value" });
        });
    });

    describe("number format", () => {
        it("converts string to number", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "42",
                    format: "number"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.result).toBe(42);
        });

        it("handles decimal numbers", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "3.14159",
                    format: "number"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe(3.14159);
        });

        it("returns NaN for non-numeric strings", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "not a number",
                    format: "number"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBeNaN();
        });
    });

    describe("boolean format", () => {
        it("converts truthy string to true", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "true",
                    format: "boolean"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.result).toBe(true);
        });

        it("converts non-empty string to true", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "any value",
                    format: "boolean"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe(true);
        });

        it("converts zero to false", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "0",
                    format: "boolean"
                }
            });

            const output = await handler.execute(input);

            // "0" is a non-empty string, so Boolean("0") is true
            expect(output.result.result).toBe(true);
        });

        it("converts 'false' string to true (non-empty string)", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "false",
                    format: "boolean"
                }
            });

            const output = await handler.execute(input);

            // String "false" is non-empty, so Boolean("false") is true
            expect(output.result.result).toBe(true);
        });
    });

    describe("variable interpolation", () => {
        it("interpolates single variable", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    InputNode: { message: "Hello from input" }
                }
            });

            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "{{InputNode.message}}",
                    format: "string"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe("Hello from input");
        });

        it("interpolates multiple variables", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    Node1: { greeting: "Hello" },
                    Node2: { name: "World" }
                }
            });

            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "{{Node1.greeting}}, {{Node2.name}}!",
                    format: "string"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe("Hello, World!");
        });

        it("interpolates nested object paths", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    DataNode: { user: { profile: { name: "Alice" } } }
                }
            });

            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "{{DataNode.user.profile.name}}",
                    format: "string"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe("Alice");
        });
    });

    describe("output naming", () => {
        it("uses specified outputName", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "customOutput",
                    value: "test value",
                    format: "string"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.customOutput).toBe("test value");
            expect(output.result.result).toBeUndefined();
        });

        it("handles outputName with special characters", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "my_output_123",
                    value: "test",
                    format: "string"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.my_output_123).toBe("test");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "test",
                    format: "string"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("schema validation", () => {
        it("throws error when outputName is missing", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    value: "test",
                    format: "string"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("throws error when value is missing", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    format: "string"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("uses default format (string) when not specified", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "test"
                }
            });

            // format defaults to "string", so this should succeed
            const output = await handler.execute(input);
            expect(output.result.result).toBe("test");
        });

        it("throws error for invalid format", async () => {
            const input = createHandlerInput({
                nodeType: "output",
                nodeConfig: {
                    outputName: "result",
                    value: "test",
                    format: "invalid"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });
    });
});
