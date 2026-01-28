/**
 * PDF Extract Handler Unit Tests
 *
 * Tests for the PdfExtractNodeHandler which extracts text
 * and metadata from PDF documents using the pdf_extract builtin tool.
 */

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../tools/builtin/pdf-extract", () => ({
    pdfExtractTool: {
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
import { PdfExtractNodeHandler, createPdfExtractNodeHandler } from "../inputs/pdf-extract";

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
        nodeType: "pdfExtract",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test PDF Extract"
        }
    };
}

describe("PdfExtractNodeHandler", () => {
    let handler: PdfExtractNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new PdfExtractNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("PdfExtractNodeHandler");
            expect(handler.supportedNodeTypes).toContain("pdfExtract");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("pdfExtract")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createPdfExtractNodeHandler();
            expect(instance).toBeInstanceOf(PdfExtractNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should extract text from all pages", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Page 1 content\nPage 2 content",
                        pages: [
                            { pageNumber: 1, text: "Page 1 content" },
                            { pageNumber: 2, text: "Page 2 content" }
                        ],
                        metadata: {
                            title: "Test Document",
                            author: "Test Author",
                            pageCount: 2,
                            isEncrypted: false
                        },
                        wordCount: 4,
                        characterCount: 30
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    extractText: true,
                    extractMetadata: true,
                    outputVariable: "pdfResult"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("pdfResult");
                expect(result.result.pdfResult).toEqual(
                    expect.objectContaining({
                        text: "Page 1 content\nPage 2 content",
                        wordCount: 4
                    })
                );
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "/workspace/document.pdf",
                        extractText: true,
                        extractMetadata: true,
                        pages: "all"
                    }),
                    expect.any(Object)
                );
            });

            it("should extract text from page range", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Page 2 content\nPage 3 content",
                        pages: [
                            { pageNumber: 2, text: "Page 2 content" },
                            { pageNumber: 3, text: "Page 3 content" }
                        ],
                        metadata: { pageCount: 5, isEncrypted: false },
                        wordCount: 4,
                        characterCount: 30
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    pageStart: 2,
                    pageEnd: 3,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        pages: { start: 2, end: 3 }
                    }),
                    expect.any(Object)
                );
            });

            it("should extract text from specific pages", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Page 1\nPage 5",
                        pages: [
                            { pageNumber: 1, text: "Page 1" },
                            { pageNumber: 5, text: "Page 5" }
                        ],
                        metadata: { pageCount: 10, isEncrypted: false },
                        wordCount: 4,
                        characterCount: 13
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    specificPages: [1, 5],
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        pages: [1, 5]
                    }),
                    expect.any(Object)
                );
            });

            it("should extract metadata", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Content",
                        pages: [{ pageNumber: 1, text: "Content" }],
                        metadata: {
                            title: "My Document",
                            author: "John Doe",
                            subject: "Testing",
                            creator: "Word",
                            producer: "PDF Library",
                            creationDate: "2024-01-15",
                            modificationDate: "2024-01-20",
                            pageCount: 1,
                            isEncrypted: false
                        },
                        wordCount: 1,
                        characterCount: 7
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    extractMetadata: true,
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const pdfData = result.result.result as {
                    metadata: {
                        title: string;
                        author: string;
                        pageCount: number;
                    };
                };
                expect(pdfData.metadata.title).toBe("My Document");
                expect(pdfData.metadata.author).toBe("John Doe");
                expect(pdfData.metadata.pageCount).toBe(1);
            });

            it("should interpolate variables in PDF path", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{pdfPath}}") return "/resolved/document.pdf";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Resolved path content",
                        pages: [{ pageNumber: 1, text: "Resolved path content" }],
                        metadata: { pageCount: 1, isEncrypted: false },
                        wordCount: 3,
                        characterCount: 21
                    }
                });

                const input = createMockInput({
                    path: "{{pdfPath}}",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "/resolved/document.pdf"
                    }),
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Document content",
                        pages: [{ pageNumber: 1, text: "Document content" }],
                        metadata: { pageCount: 1, isEncrypted: false },
                        wordCount: 2,
                        characterCount: 16
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    outputVariable: "myPdfData"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("myPdfData");
                expect(result.result.myPdfData).toEqual(
                    expect.objectContaining({
                        text: "Document content"
                    })
                );
            });

            it("should return page-by-page text", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "All content",
                        pages: [
                            { pageNumber: 1, text: "First page" },
                            { pageNumber: 2, text: "Second page" },
                            { pageNumber: 3, text: "Third page" }
                        ],
                        metadata: { pageCount: 3, isEncrypted: false },
                        wordCount: 6,
                        characterCount: 30
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const pdfData = result.result.result as {
                    pages: Array<{ pageNumber: number; text: string }>;
                };
                expect(pdfData.pages).toHaveLength(3);
                expect(pdfData.pages[0].text).toBe("First page");
                expect(pdfData.pages[1].pageNumber).toBe(2);
            });
        });

        describe("page selection modes", () => {
            it("should handle pageSelection 'all' (default)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "All pages",
                        pages: [],
                        metadata: { pageCount: 5, isEncrypted: false },
                        wordCount: 2,
                        characterCount: 9
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        pages: "all"
                    }),
                    expect.any(Object)
                );
            });

            it("should handle pageSelection 'range' with start and end", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Range pages",
                        pages: [],
                        metadata: { pageCount: 10, isEncrypted: false },
                        wordCount: 2,
                        characterCount: 11
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    pageStart: 3,
                    pageEnd: 7,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        pages: { start: 3, end: 7 }
                    }),
                    expect.any(Object)
                );
            });

            it("should handle pageSelection 'specific' with page array", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Specific pages",
                        pages: [],
                        metadata: { pageCount: 20, isEncrypted: false },
                        wordCount: 2,
                        characterCount: 14
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    specificPages: [1, 3, 5, 7],
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        pages: [1, 3, 5, 7]
                    }),
                    expect.any(Object)
                );
            });

            it("should handle single page extraction", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Single page",
                        pages: [{ pageNumber: 5, text: "Single page" }],
                        metadata: { pageCount: 10, isEncrypted: false },
                        wordCount: 2,
                        characterCount: 11
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    specificPages: [5],
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        pages: [5]
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("output formats", () => {
            it("should output as plain text", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Plain text output",
                        pages: [],
                        metadata: { pageCount: 1, isEncrypted: false },
                        wordCount: 3,
                        characterCount: 17
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    outputFormat: "text",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        outputFormat: "text"
                    }),
                    expect.any(Object)
                );
            });

            it("should output as JSON", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "JSON output",
                        pages: [],
                        metadata: { pageCount: 1, isEncrypted: false },
                        wordCount: 2,
                        characterCount: 11
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    outputFormat: "json",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        outputFormat: "json"
                    }),
                    expect.any(Object)
                );
            });

            it("should output as markdown", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "# Markdown output",
                        pages: [],
                        metadata: { pageCount: 1, isEncrypted: false },
                        wordCount: 2,
                        characterCount: 17
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    outputFormat: "markdown",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        outputFormat: "markdown"
                    }),
                    expect.any(Object)
                );
            });
        });

        describe("metadata extraction", () => {
            it("should extract title when present", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "",
                        pages: [],
                        metadata: {
                            title: "Document Title",
                            pageCount: 1,
                            isEncrypted: false
                        },
                        wordCount: 0,
                        characterCount: 0
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    extractMetadata: true,
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(
                    (result.result.result as { metadata: { title: string } }).metadata.title
                ).toBe("Document Title");
            });

            it("should extract author when present", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "",
                        pages: [],
                        metadata: {
                            author: "Jane Smith",
                            pageCount: 1,
                            isEncrypted: false
                        },
                        wordCount: 0,
                        characterCount: 0
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    extractMetadata: true,
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(
                    (result.result.result as { metadata: { author: string } }).metadata.author
                ).toBe("Jane Smith");
            });

            it("should extract creation date", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "",
                        pages: [],
                        metadata: {
                            creationDate: "2024-01-15T10:30:00Z",
                            pageCount: 1,
                            isEncrypted: false
                        },
                        wordCount: 0,
                        characterCount: 0
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    extractMetadata: true,
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(
                    (result.result.result as { metadata: { creationDate: string } }).metadata
                        .creationDate
                ).toBe("2024-01-15T10:30:00Z");
            });

            it("should extract page count", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "",
                        pages: [],
                        metadata: {
                            pageCount: 42,
                            isEncrypted: false
                        },
                        wordCount: 0,
                        characterCount: 0
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
                    extractMetadata: true,
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(
                    (result.result.result as { metadata: { pageCount: number } }).metadata.pageCount
                ).toBe(42);
            });

            it("should detect encrypted status", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "",
                        pages: [],
                        metadata: {
                            pageCount: 1,
                            isEncrypted: true
                        },
                        wordCount: 0,
                        characterCount: 0
                    }
                });

                const input = createMockInput({
                    path: "/workspace/encrypted.pdf",
                    extractMetadata: true,
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect(
                    (result.result.result as { metadata: { isEncrypted: boolean } }).metadata
                        .isEncrypted
                ).toBe(true);
            });
        });

        describe("encrypted PDFs", () => {
            it("should extract from password-protected PDF with correct password", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Protected content",
                        pages: [{ pageNumber: 1, text: "Protected content" }],
                        metadata: { pageCount: 1, isEncrypted: true },
                        wordCount: 2,
                        characterCount: 17
                    }
                });

                const input = createMockInput({
                    path: "/workspace/protected.pdf",
                    password: "correct-password",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        password: "correct-password"
                    }),
                    expect.any(Object)
                );
            });

            it("should fail on password-protected PDF without password", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "PDF is encrypted and requires a password" }
                });

                const input = createMockInput({
                    path: "/workspace/protected.pdf",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "PDF is encrypted and requires a password"
                );
            });

            it("should fail on password-protected PDF with wrong password", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Incorrect password" }
                });

                const input = createMockInput({
                    path: "/workspace/protected.pdf",
                    password: "wrong-password",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Incorrect password");
            });
        });

        describe("validation", () => {
            it("should throw error when PDF path is missing", async () => {
                const input = createMockInput({
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow();
            });

            it("should throw error when PDF path is not a string", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce(12345);

                const input = createMockInput({
                    path: "{{nonStringPath}}",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("PDF file path is required");
            });
        });

        describe("error handling", () => {
            it("should handle file not found", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "PDF file not found" }
                });

                const input = createMockInput({
                    path: "/workspace/nonexistent.pdf",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("PDF file not found");
            });

            it("should handle corrupted PDF files", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Failed to parse PDF: file is corrupted" }
                });

                const input = createMockInput({
                    path: "/workspace/corrupted.pdf",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Failed to parse PDF: file is corrupted"
                );
            });

            it("should handle non-PDF files", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "File is not a valid PDF" }
                });

                const input = createMockInput({
                    path: "/workspace/notapdf.txt",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("File is not a valid PDF");
            });
        });

        describe("edge cases", () => {
            it("should handle PDFs with no text (image-only)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "",
                        pages: [{ pageNumber: 1, text: "" }],
                        metadata: { pageCount: 1, isEncrypted: false },
                        wordCount: 0,
                        characterCount: 0
                    }
                });

                const input = createMockInput({
                    path: "/workspace/scanned.pdf",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect((result.result.result as { text: string }).text).toBe("");
                expect((result.result.result as { wordCount: number }).wordCount).toBe(0);
            });

            it("should handle result without output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "No output var",
                        pages: [],
                        metadata: { pageCount: 1, isEncrypted: false },
                        wordCount: 3,
                        characterCount: 13
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf"
                    // No outputVariable
                });

                const result = await handler.execute(input);

                expect(Object.keys(result.result)).toHaveLength(0);
            });

            it("should include duration metrics", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Test",
                        pages: [],
                        metadata: { pageCount: 1, isEncrypted: false },
                        wordCount: 1,
                        characterCount: 4
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
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
                        text: "Test",
                        pages: [],
                        metadata: { pageCount: 1, isEncrypted: false },
                        wordCount: 1,
                        characterCount: 4
                    }
                });

                const input = createMockInput({
                    path: "/workspace/document.pdf",
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
