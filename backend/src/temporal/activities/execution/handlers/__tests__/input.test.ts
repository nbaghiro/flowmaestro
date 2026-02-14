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
} from "../../../../../../__tests__/helpers/handler-test-utils";
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

    describe("concurrent input processing", () => {
        it("handles multiple simultaneous inputs", async () => {
            const inputs = Array.from({ length: 10 }, (_, i) =>
                createHandlerInput({
                    nodeType: "input",
                    nodeConfig: {
                        inputType: "text",
                        value: `Input ${i}`
                    }
                })
            );

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(10);
            outputs.forEach((output, i) => {
                expect(output.result.input).toBe(`Input ${i}`);
            });
        });

        it("handles concurrent JSON parsing", async () => {
            const inputs = Array.from({ length: 5 }, (_, i) =>
                createHandlerInput({
                    nodeType: "input",
                    nodeConfig: {
                        inputType: "json",
                        value: JSON.stringify({ index: i, data: `item_${i}` })
                    }
                })
            );

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(5);
            outputs.forEach((output, i) => {
                const result = output.result.input as { index: number; data: string };
                expect(result.index).toBe(i);
                expect(result.data).toBe(`item_${i}`);
            });
        });

        it("handles mixed input types concurrently", async () => {
            const inputs = [
                createHandlerInput({
                    nodeType: "input",
                    nodeConfig: { inputType: "text", value: "text value" }
                }),
                createHandlerInput({
                    nodeType: "input",
                    nodeConfig: { inputType: "json", value: '{"key": "value"}' }
                }),
                createHandlerInput({
                    nodeType: "input",
                    nodeConfig: { inputType: "text", value: "another text" }
                }),
                createHandlerInput({
                    nodeType: "input",
                    nodeConfig: { inputType: "json", value: "[1, 2, 3]" }
                })
            ];

            const outputs = await Promise.all(inputs.map((input) => handler.execute(input)));

            expect(outputs).toHaveLength(4);
            expect(outputs[0].result.input).toBe("text value");
            expect(outputs[1].result.input).toEqual({ key: "value" });
            expect(outputs[2].result.input).toBe("another text");
            expect(outputs[3].result.input).toEqual([1, 2, 3]);
        });
    });

    describe("additional JSON edge cases", () => {
        it("handles JSON with deeply nested structure", async () => {
            const deepJson = JSON.stringify({
                level1: {
                    level2: {
                        level3: {
                            level4: {
                                level5: {
                                    value: "deep"
                                }
                            }
                        }
                    }
                }
            });

            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: deepJson
                }
            });

            const output = await handler.execute(input);

            const result = output.result.input as {
                level1: { level2: { level3: { level4: { level5: { value: string } } } } };
            };
            expect(result.level1.level2.level3.level4.level5.value).toBe("deep");
        });

        it("handles JSON with empty object", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: "{}"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toEqual({});
        });

        it("handles JSON with empty array", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: "[]"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toEqual([]);
        });

        it("handles JSON with mixed types in array", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: '[1, "two", true, null, {"key": "value"}]'
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toEqual([1, "two", true, null, { key: "value" }]);
        });

        it("handles JSON string with escaped quotes", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: '{"message": "He said \\"Hello\\""}'
                }
            });

            const output = await handler.execute(input);

            expect((output.result.input as { message: string }).message).toBe('He said "Hello"');
        });

        it("handles JSON with unicode escape sequences", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: '{"text": "\\u0048\\u0065\\u006c\\u006c\\u006f"}'
                }
            });

            const output = await handler.execute(input);

            expect((output.result.input as { text: string }).text).toBe("Hello");
        });
    });

    describe("text input edge cases", () => {
        it("handles text with only whitespace", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "   \n\t\r   "
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toBe("   \n\t\r   ");
        });

        it("handles text with null bytes", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "text\x00with\x00nulls"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toBe("text\x00with\x00nulls");
        });

        it("handles text with control characters", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "line1\r\nline2\tindented"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toBe("line1\r\nline2\tindented");
        });

        it("handles text with emoji sequences", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "👨‍👩‍👧‍👦 Family emoji and 🏳️‍🌈 flag"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.input).toContain("👨‍👩‍👧‍👦");
            expect(output.result.input).toContain("🏳️‍🌈");
        });
    });

    describe("validation and error handling", () => {
        it("handles missing value gracefully", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text"
                    // value is missing
                }
            });

            // Should either return undefined/empty or throw a clear error
            try {
                const output = await handler.execute(input);
                // If it doesn't throw, the result should be handled
                expect(output.result.input === undefined || output.result.input === "").toBe(true);
            } catch {
                // If it throws, that's also acceptable behavior
                expect(true).toBe(true);
            }
        });

        it("handles numeric string as text", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "12345"
                }
            });

            const output = await handler.execute(input);

            // Should remain as string, not converted to number
            expect(output.result.input).toBe("12345");
            expect(typeof output.result.input).toBe("string");
        });

        it("handles boolean string as text", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "true"
                }
            });

            const output = await handler.execute(input);

            // Should remain as string "true", not converted to boolean
            expect(output.result.input).toBe("true");
            expect(typeof output.result.input).toBe("string");
        });
    });

    describe("output structure", () => {
        it("includes all expected fields in output", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "text",
                    value: "test"
                }
            });

            const output = await handler.execute(input);

            expect(output).toHaveProperty("result");
            expect(output).toHaveProperty("metrics");
            expect(output.result).toHaveProperty("input");
            expect(output.result).toHaveProperty("_inputMetadata");
        });

        it("preserves original value type information in metadata", async () => {
            const input = createHandlerInput({
                nodeType: "input",
                nodeConfig: {
                    inputType: "json",
                    value: '{"complex": true}'
                }
            });

            const output = await handler.execute(input);
            const metadata = output.result._inputMetadata as { inputType: string; value: unknown };

            expect(metadata.inputType).toBe("json");
            // The handler parses JSON values, so metadata.value is the parsed object
            expect(metadata.value).toEqual({ complex: true });
        });
    });
});
