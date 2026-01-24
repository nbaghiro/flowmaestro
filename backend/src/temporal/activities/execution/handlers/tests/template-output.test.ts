/**
 * Template Output Node Handler Unit Tests
 *
 * Tests template output node logic:
 * - Handler properties and type support
 * - Markdown template rendering
 * - Variable interpolation in templates
 * - HTML conversion
 * - Schema validation
 */

import {
    createHandlerInput,
    createTestContext,
    assertValidOutput
} from "../../../../../../tests/helpers/handler-test-utils";
import {
    TemplateOutputNodeHandler,
    createTemplateOutputNodeHandler
} from "../outputs/template-output";

describe("TemplateOutputNodeHandler", () => {
    let handler: TemplateOutputNodeHandler;

    beforeEach(() => {
        handler = createTemplateOutputNodeHandler();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("TemplateOutputNodeHandler");
        });

        it("supports templateOutput node type", () => {
            expect(handler.supportedNodeTypes).toContain("templateOutput");
        });

        it("can handle templateOutput type", () => {
            expect(handler.canHandle("templateOutput")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("output")).toBe(false);
            expect(handler.canHandle("template")).toBe(false);
        });
    });

    describe("markdown output", () => {
        it("returns raw markdown when format is markdown", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "# Hello World\n\nThis is a paragraph.",
                    outputFormat: "markdown"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.result).toBe("# Hello World\n\nThis is a paragraph.");
        });

        it("preserves markdown formatting", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "**bold** and *italic* text",
                    outputFormat: "markdown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe("**bold** and *italic* text");
        });

        it("handles markdown lists", async () => {
            const template = `- Item 1
- Item 2
- Item 3`;

            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template,
                    outputFormat: "markdown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe(template);
        });
    });

    describe("HTML output", () => {
        it("converts markdown to HTML", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "# Hello World",
                    outputFormat: "html"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.result).toContain("<h1>");
            expect(output.result.result).toContain("Hello World");
            expect(output.result.result).toContain("</h1>");
        });

        it("converts bold to strong tags", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "**bold text**",
                    outputFormat: "html"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toContain("<strong>");
            expect(output.result.result).toContain("bold text");
        });

        it("converts italic to em tags", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "*italic text*",
                    outputFormat: "html"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toContain("<em>");
            expect(output.result.result).toContain("italic text");
        });

        it("converts lists to HTML", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "- Item 1\n- Item 2",
                    outputFormat: "html"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toContain("<ul>");
            expect(output.result.result).toContain("<li>");
            expect(output.result.result).toContain("Item 1");
        });

        it("converts code blocks", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "```javascript\nconst x = 1;\n```",
                    outputFormat: "html"
                }
            });

            const output = await handler.execute(input);
            const resultStr = String(output.result.result);

            expect(resultStr).toContain("<pre>");
            expect(resultStr).toContain("const x = 1;");
        });
    });

    describe("variable interpolation", () => {
        it("interpolates single variable in template", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    UserData: { name: "Alice" }
                }
            });

            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "Hello, {{UserData.name}}!",
                    outputFormat: "markdown"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe("Hello, Alice!");
        });

        it("interpolates multiple variables", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    User: { name: "Bob" },
                    Stats: { visits: 42 }
                }
            });

            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "User {{User.name}} has {{Stats.visits}} visits",
                    outputFormat: "markdown"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe("User Bob has 42 visits");
        });

        it("interpolates variables in markdown formatting", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    Report: { title: "Monthly Report", summary: "All systems operational" }
                }
            });

            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "# {{Report.title}}\n\n**Summary:** {{Report.summary}}",
                    outputFormat: "markdown"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe(
                "# Monthly Report\n\n**Summary:** All systems operational"
            );
        });

        it("interpolates variables then converts to HTML", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    Data: { heading: "Results" }
                }
            });

            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "# {{Data.heading}}",
                    outputFormat: "html"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.result).toContain("<h1>");
            expect(output.result.result).toContain("Results");
        });

        it("handles nested object paths", async () => {
            const context = createTestContext({
                nodeOutputs: {
                    API: { response: { data: { message: "Success!" } } }
                }
            });

            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "Status: {{API.response.data.message}}",
                    outputFormat: "markdown"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe("Status: Success!");
        });
    });

    describe("output naming", () => {
        it("uses specified outputName", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "customTemplate",
                    template: "Test content",
                    outputFormat: "markdown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.customTemplate).toBe("Test content");
            expect(output.result.result).toBeUndefined();
        });
    });

    describe("edge cases", () => {
        it("throws error for empty template", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "",
                    outputFormat: "markdown"
                }
            });

            // Empty template violates min length of 1
            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles template with only whitespace", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "   \n\n   ",
                    outputFormat: "markdown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe("   \n\n   ");
        });

        it("handles very long template", async () => {
            const longContent = "Lorem ipsum ".repeat(1000);
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: `# Long Document\n\n${longContent}`,
                    outputFormat: "markdown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toContain("# Long Document");
            expect((output.result.result as string).length).toBeGreaterThan(10000);
        });

        it("handles special characters in template", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "Special: <>&\"' © € £",
                    outputFormat: "markdown"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.result).toBe("Special: <>&\"' © € £");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "Test",
                    outputFormat: "markdown"
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
                nodeType: "templateOutput",
                nodeConfig: {
                    template: "Test",
                    outputFormat: "markdown"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("throws error when template is missing", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    outputFormat: "markdown"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("uses default outputFormat (markdown) when not specified", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "Test content"
                }
            });

            // outputFormat defaults to "markdown", so this should succeed
            const output = await handler.execute(input);
            expect(output.result.result).toBe("Test content");
        });

        it("throws error for invalid outputFormat", async () => {
            const input = createHandlerInput({
                nodeType: "templateOutput",
                nodeConfig: {
                    outputName: "result",
                    template: "Test",
                    outputFormat: "invalid"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });
    });
});
