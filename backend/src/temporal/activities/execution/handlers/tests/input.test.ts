/**
 * Input Node Handler Unit Tests
 *
 * Tests input node logic:
 * - Handler properties and type support
 * - Text input handling
 * - JSON input parsing
 * - Schema validation
 */

import {
    createHandlerInput,
    assertValidOutput
} from "../../../../../../tests/helpers/handler-test-utils";
import { InputNodeHandler, createInputNodeHandler } from "../inputs/input";

describe("InputNodeHandler", () => {
    let handler: InputNodeHandler;

    beforeEach(() => {
        handler = createInputNodeHandler();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("InputNodeHandler");
        });

        it("supports input node type", () => {
            expect(handler.supportedNodeTypes).toContain("input");
        });

        it("can handle input type", () => {
            expect(handler.canHandle("input")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("output")).toBe(false);
            expect(handler.canHandle("transform")).toBe(false);
        });
    });

    describe("text input", () => {
        it("returns text value directly", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "Hello, World!"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.input).toBe("Hello, World!");
        });

        it("handles empty text", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: ""
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.input).toBe("");
        });

        it("handles multiline text", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "Line 1\nLine 2\nLine 3"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toBe("Line 1\nLine 2\nLine 3");
        });

        it("handles special characters", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "Special: <>&\"'\\n\\t 你好"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toBe("Special: <>&\"'\\n\\t 你好");
        });
    });

    describe("JSON input", () => {
        it("parses valid JSON object", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: '{"name": "test", "count": 42}'
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.input).toEqual({ name: "test", count: 42 });
        });

        it("parses valid JSON array", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: "[1, 2, 3, 4, 5]"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toEqual([1, 2, 3, 4, 5]);
        });

        it("parses nested JSON", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: '{"user": {"name": "Alice", "settings": {"theme": "dark"}}}'
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toEqual({
                user: {
                    name: "Alice",
                    settings: { theme: "dark" }
                }
            });
        });

        it("handles invalid JSON gracefully (returns as string)", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: "not valid json"
                }
            });

            const output = await handler.execute(input);

            // Should return as string when parsing fails
            assertValidOutput(output);
            expect(output.result.input).toBe("not valid json");
        });

        it("parses JSON primitives", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: "42"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toBe(42);
        });

        it("parses JSON boolean", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: "true"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toBe(true);
        });

        it("parses JSON null", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: "null"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toBeNull();
        });
    });

    describe("output metadata", () => {
        it("includes inputType in metadata", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "test"
                }
            });

            const output = await handler.execute(input);
            const metadata = output.result._inputMetadata as { inputType: string; value: unknown };

            expect(metadata).toBeDefined();
            expect(metadata.inputType).toBe("text");
        });

        it("includes value in metadata", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "test value"
                }
            });

            const output = await handler.execute(input);
            const metadata = output.result._inputMetadata as { inputType: string; value: unknown };

            expect(metadata.value).toBe("test value");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "test"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("schema validation", () => {
        it("uses default inputType (text) when not specified", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    value: "test"
                }
            });

            // inputType defaults to "text", so this should succeed
            const output = await handler.execute(input);
            const metadata = output.result._inputMetadata as { inputType: string };
            expect(metadata.inputType).toBe("text");
        });

        it("throws error for invalid inputType", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "invalid",
                    value: "test"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });
    });

    describe("edge cases", () => {
        it("handles very long text", async () => {
            const longText = "a".repeat(100000);
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: longText
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toHaveLength(100000);
        });

        it("handles large JSON", async () => {
            const largeArray = JSON.stringify(
                Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    name: `Item ${i}`,
                    data: "some data"
                }))
            );

            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: largeArray
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toHaveLength(1000);
        });
    });
});
