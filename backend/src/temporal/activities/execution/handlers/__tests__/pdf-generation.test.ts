/**
 * PDF Generation Handler Unit Tests
 *
 * Tests for the PdfGenerationNodeHandler which generates PDF documents
 * from markdown or HTML content using the pdf_generate builtin tool.
 */

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../tools/builtin/pdf-generate", () => ({
    pdfGenerateTool: {
        execute: mockExecute
    }
}));

// Mock logger
jest.mock("../../../../core", () => ({
    createActivityLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }),
    interpolateVariables: jest.fn((value: unknown, _context: unknown) => value),
    getExecutionContext: jest.fn((context: unknown) => context)
}));

import type { JsonObject } from "@flowmaestro/shared";
import { interpolateVariables } from "../../../../core";
import {
    PdfGenerationNodeHandler,
    createPdfGenerationNodeHandler
} from "../outputs/pdf-generation";

import type { ContextSnapshot } from "../../../../core/types";
import type { NodeHandlerInput } from "../../types";

// Helper to create mock context
function createMockContext(overrides: Partial<ContextSnapshot> = {}): ContextSnapshot {
    return {
        workflowId: "test-workflow-id",
        executionId: "test-execution-id",
        variables: new Map(),
        nodeOutputs: new Map(),
        sharedMemory: new Map(),
        secrets: new Map(),
        loopStates: [],
        parallelStates: [],
        ...overrides
    } as ContextSnapshot;
}

// Helper to create mock input
function createMockInput(
    nodeConfig: JsonObject,
    contextOverrides: Partial<ContextSnapshot> = {}
): NodeHandlerInput {
    return {
        nodeType: "pdfGeneration",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test PDF Generation"
        }
    };
}

describe("PdfGenerationNodeHandler", () => {
    let handler: PdfGenerationNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new PdfGenerationNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("PdfGenerationNodeHandler");
            expect(handler.supportedNodeTypes).toContain("pdfGeneration");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("pdfGeneration")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createPdfGenerationNodeHandler();
            expect(instance).toBeInstanceOf(PdfGenerationNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should generate PDF from markdown content", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/document.pdf",
                        filename: "document.pdf",
                        size: 50000,
                        pageCount: 3
                    }
                });

                const input = createMockInput({
                    content: "# Hello World\n\nThis is markdown content.",
                    format: "markdown",
                    outputVariable: "pdfResult"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("pdfResult");
                expect(result.result.pdfResult).toEqual(
                    expect.objectContaining({
                        filename: "document.pdf",
                        pageCount: 3
                    })
                );
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: "# Hello World\n\nThis is markdown content.",
                        format: "markdown"
                    }),
                    expect.any(Object)
                );
            });

            it("should generate PDF from HTML content", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 40000,
                        pageCount: 2
                    }
                });

                const input = createMockInput({
                    content: "<html><body><h1>Hello</h1></body></html>",
                    format: "html",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        format: "html"
                    }),
                    expect.any(Object)
                );
            });

            it("should interpolate variables in content", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{reportContent}}") return "# Generated Report\n\nContent here.";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/report.pdf",
                        filename: "report.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "{{reportContent}}",
                    format: "markdown",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: "# Generated Report\n\nContent here."
                    }),
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/output.pdf",
                        filename: "output.pdf",
                        size: 25000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    format: "markdown",
                    outputVariable: "myPdfOutput"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("myPdfOutput");
            });

            it("should return file metadata (path, size, pageCount)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 100000,
                        pageCount: 10
                    }
                });

                const input = createMockInput({
                    content: "# Long Document",
                    format: "markdown",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const pdfData = result.result.result as {
                    path: string;
                    size: number;
                    pageCount: number;
                };
                expect(pdfData.path).toBe("/workspace/doc.pdf");
                expect(pdfData.size).toBe(100000);
                expect(pdfData.pageCount).toBe(10);
            });
        });

        describe("page configuration", () => {
            it("should use letter page size", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    pageSize: "letter",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        pageSize: "letter"
                    }),
                    expect.any(Object)
                );
            });

            it("should use A4 page size", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    pageSize: "a4",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        pageSize: "a4"
                    }),
                    expect.any(Object)
                );
            });

            it("should use portrait orientation", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    orientation: "portrait",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        orientation: "portrait"
                    }),
                    expect.any(Object)
                );
            });

            it("should use landscape orientation", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    orientation: "landscape",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        orientation: "landscape"
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("margins", () => {
            it("should apply custom top margin", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    marginTop: "30mm",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        margins: expect.objectContaining({ top: "30mm" })
                    }),
                    expect.any(Object)
                );
            });

            it("should apply all custom margins", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    marginTop: "10mm",
                    marginRight: "15mm",
                    marginBottom: "20mm",
                    marginLeft: "25mm",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        margins: {
                            top: "10mm",
                            right: "15mm",
                            bottom: "20mm",
                            left: "25mm"
                        }
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("headers and footers", () => {
            it("should add header text", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    headerText: "Company Report",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        headerText: "Company Report"
                    }),
                    expect.any(Object)
                );
            });

            it("should add footer text", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    footerText: "Confidential",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        footerText: "Confidential"
                    }),
                    expect.any(Object)
                );
            });

            it("should add page numbers when enabled", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 5
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    includePageNumbers: true,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        includePageNumbers: true
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("validation", () => {
            it("should throw error when content is missing", async () => {
                const input = createMockInput({
                    format: "markdown",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow();
            });

            it("should throw error when content is not a string", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce(12345);

                const input = createMockInput({
                    content: "{{nonStringContent}}",
                    format: "markdown",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("PDF content is required");
            });
        });

        describe("error handling", () => {
            it("should handle invalid markdown", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Failed to parse markdown content" }
                });

                const input = createMockInput({
                    content: "{{{{invalid markdown",
                    format: "markdown",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Failed to parse markdown content"
                );
            });

            it("should handle invalid HTML", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Failed to parse HTML content" }
                });

                const input = createMockInput({
                    content: "<html><body><unclosed>",
                    format: "html",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Failed to parse HTML content"
                );
            });

            it("should handle tool execution failures", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "PDF generation failed" }
                });

                const input = createMockInput({
                    content: "# Test",
                    format: "markdown",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("PDF generation failed");
            });
        });

        describe("edge cases", () => {
            it("should handle unicode characters", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/unicode.pdf",
                        filename: "unicode.pdf",
                        size: 35000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# 你好世界\n\nHello 🎉 مرحبا",
                    format: "markdown",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: "# 你好世界\n\nHello 🎉 مرحبا"
                    }),
                    expect.any(Object)
                );
            });

            it("should handle code blocks with syntax highlighting", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/code.pdf",
                        filename: "code.pdf",
                        size: 40000,
                        pageCount: 2
                    }
                });

                const content = `# Code Example

\`\`\`typescript
function hello(): string {
    return "world";
}
\`\`\`
`;

                const input = createMockInput({
                    content,
                    format: "markdown",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: expect.stringContaining("```typescript")
                    }),
                    expect.any(Object)
                );
            });

            it("should handle result without output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    format: "markdown"
                    // No outputVariable
                });

                const result = await handler.execute(input);

                expect(Object.keys(result.result)).toHaveLength(0);
            });

            it("should include duration metrics", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    format: "markdown",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(result.metrics?.durationMs).toBeDefined();
                expect(result.metrics?.durationMs).toBeGreaterThanOrEqual(0);
            });

            it("should pass tool execution context correctly", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        path: "/workspace/doc.pdf",
                        filename: "doc.pdf",
                        size: 30000,
                        pageCount: 1
                    }
                });

                const input = createMockInput({
                    content: "# Test",
                    format: "markdown",
                    outputVariable: "result"
                });
                input.metadata.userId = "user-123";
                input.metadata.executionId = "exec-456";

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.any(Object),
                    expect.objectContaining({
                        userId: "user-123",
                        mode: "workflow",
                        traceId: "exec-456"
                    })
                );
            });
        });
    });
});
