/**
 * OCR Extraction Handler Unit Tests
 *
 * Tests for the OCRExtractionNodeHandler which extracts text
 * from images using the ocr_extract builtin tool (Tesseract).
 */

// Mock the builtin tool
const mockExecute = jest.fn();
jest.mock("../../../../../services/tools/builtin/ocr-extract", () => ({
    ocrExtractTool: {
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
import { OCRExtractionNodeHandler, createOCRExtractionNodeHandler } from "../ai/ocr-extraction";
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
        nodeType: "ocrExtraction",
        nodeConfig,
        context: createMockContext(contextOverrides),
        metadata: {
            executionId: "test-execution-id",
            nodeId: "test-node-id",
            nodeName: "Test OCR Extraction"
        }
    };
}

describe("OCRExtractionNodeHandler", () => {
    let handler: OCRExtractionNodeHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        handler = new OCRExtractionNodeHandler();
        (interpolateVariables as jest.Mock).mockImplementation((value: unknown) => value);
    });

    describe("properties", () => {
        it("should have correct handler properties", () => {
            expect(handler.name).toBe("OCRExtractionNodeHandler");
            expect(handler.supportedNodeTypes).toContain("ocrExtraction");
        });

        it("should report canHandle correctly", () => {
            expect(handler.canHandle("ocrExtraction")).toBe(true);
            expect(handler.canHandle("otherType")).toBe(false);
        });
    });

    describe("factory function", () => {
        it("should create handler instance", () => {
            const instance = createOCRExtractionNodeHandler();
            expect(instance).toBeInstanceOf(OCRExtractionNodeHandler);
        });
    });

    describe("execute", () => {
        describe("happy path", () => {
            it("should extract text from image with default settings", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Extracted text content",
                        confidence: 95.5,
                        lineCount: 3,
                        wordCount: 3,
                        characterCount: 21,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/to/image.png",
                    languages: ["eng"],
                    outputVariable: "ocrResult"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("ocrResult");
                expect(result.result.ocrResult).toEqual(
                    expect.objectContaining({
                        text: "Extracted text content",
                        confidence: 95.5
                    })
                );
                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "/path/to/image.png",
                        language: ["eng"]
                    }),
                    expect.any(Object)
                );
            });

            it("should extract text with specified language", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Texte en francais",
                        confidence: 92.0,
                        lineCount: 1,
                        wordCount: 3,
                        characterCount: 17,
                        language: "fra"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/to/french.png",
                    languages: ["fra"],
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        language: ["fra"]
                    }),
                    expect.any(Object)
                );
            });

            it("should extract text with multiple languages", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Mixed language text",
                        confidence: 88.0,
                        lineCount: 2,
                        wordCount: 3,
                        characterCount: 19,
                        language: "eng+fra"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/to/multilang.png",
                    languages: ["eng", "fra"],
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        language: ["eng", "fra"]
                    }),
                    expect.any(Object)
                );
            });

            it("should interpolate variables in image source path", async () => {
                (interpolateVariables as jest.Mock).mockImplementation((value: string) => {
                    if (value === "{{imagePath}}") return "/resolved/image.png";
                    return value;
                });

                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Interpolated path",
                        confidence: 90.0,
                        lineCount: 1,
                        wordCount: 2,
                        characterCount: 17,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "{{imagePath}}",
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        path: "/resolved/image.png"
                    }),
                    expect.any(Object)
                );
            });

            it("should store result in output variable", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Output variable test",
                        confidence: 95.0,
                        lineCount: 1,
                        wordCount: 3,
                        characterCount: 20,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
                    outputVariable: "myOcrResult"
                });

                const result = await handler.execute(input);

                expect(result.result).toHaveProperty("myOcrResult");
                expect(result.result.myOcrResult).toEqual(
                    expect.objectContaining({ text: "Output variable test" })
                );
            });

            it("should return confidence scores", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Confidence test",
                        confidence: 87.5,
                        lineCount: 1,
                        wordCount: 2,
                        characterCount: 15,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                expect((result.result.result as { confidence: number }).confidence).toBe(87.5);
            });

            it("should return word-level bounding boxes when available", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Hello World",
                        confidence: 95.0,
                        lineCount: 1,
                        wordCount: 2,
                        characterCount: 11,
                        language: "eng",
                        words: [
                            {
                                text: "Hello",
                                confidence: 96.0,
                                bbox: { x: 10, y: 20, width: 50, height: 20 },
                                lineNum: 1,
                                wordNum: 1
                            },
                            {
                                text: "World",
                                confidence: 94.0,
                                bbox: { x: 70, y: 20, width: 50, height: 20 },
                                lineNum: 1,
                                wordNum: 2
                            }
                        ]
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
                    outputVariable: "result"
                });

                const result = await handler.execute(input);

                const ocrResult = result.result.result as { words: unknown[] };
                expect(ocrResult.words).toHaveLength(2);
                expect(ocrResult.words[0]).toHaveProperty("bbox");
            });
        });

        describe("configuration options", () => {
            it("should handle PSM mode 0 (orientation detection)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "",
                        confidence: 0,
                        lineCount: 0,
                        wordCount: 0,
                        characterCount: 0,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
                    psm: 0,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({ psm: 0 }),
                    expect.any(Object)
                );
            });

            it("should handle PSM mode 3 (auto page segmentation)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Auto segmented",
                        confidence: 90.0,
                        lineCount: 1,
                        wordCount: 2,
                        characterCount: 14,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
                    psm: 3,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({ psm: 3 }),
                    expect.any(Object)
                );
            });

            it("should handle PSM mode 6 (single block of text)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Single block",
                        confidence: 92.0,
                        lineCount: 1,
                        wordCount: 2,
                        characterCount: 12,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
                    psm: 6,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({ psm: 6 }),
                    expect.any(Object)
                );
            });

            it("should handle PSM mode 11 (sparse text)", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Sparse text",
                        confidence: 85.0,
                        lineCount: 1,
                        wordCount: 2,
                        characterCount: 11,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
                    psm: 11,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({ psm: 11 }),
                    expect.any(Object)
                );
            });

            it("should apply confidence threshold filtering", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "High confidence only",
                        confidence: 95.0,
                        lineCount: 1,
                        wordCount: 3,
                        characterCount: 20,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
                    confidenceThreshold: 90,
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({ confidenceThreshold: 90 }),
                    expect.any(Object)
                );
            });

            it("should apply preprocessing options", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "Preprocessed text",
                        confidence: 93.0,
                        lineCount: 1,
                        wordCount: 2,
                        characterCount: 17,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
                    preprocessing: {
                        grayscale: true,
                        denoise: true,
                        deskew: true,
                        threshold: false
                    },
                    outputVariable: "result"
                });

                await handler.execute(input);

                expect(mockExecute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        preprocessing: {
                            grayscale: true,
                            denoise: true,
                            deskew: true,
                            threshold: false
                        }
                    }),
                    expect.any(Object)
                );
            });

            it("should handle different output formats (text, hocr, tsv, json)", async () => {
                const formats = ["text", "hocr", "tsv", "json"] as const;

                for (const format of formats) {
                    mockExecute.mockResolvedValueOnce({
                        success: true,
                        data: {
                            text: "Format test",
                            confidence: 90.0,
                            lineCount: 1,
                            wordCount: 2,
                            characterCount: 11,
                            language: "eng"
                        }
                    });

                    const input = createMockInput({
                        imageSource: "/path/image.png",
                        outputFormat: format,
                        outputVariable: "result"
                    });

                    await handler.execute(input);

                    expect(mockExecute).toHaveBeenLastCalledWith(
                        expect.objectContaining({ outputFormat: format }),
                        expect.any(Object)
                    );
                }
            });
        });

        describe("validation", () => {
            it("should throw error when image source is missing", async () => {
                const input = createMockInput({
                    languages: ["eng"],
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow();
            });

            it("should throw error when image source is not a string", async () => {
                (interpolateVariables as jest.Mock).mockReturnValueOnce(12345);

                const input = createMockInput({
                    imageSource: "{{nonStringVar}}",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Image source path is required"
                );
            });
        });

        describe("error handling", () => {
            it("should handle tool execution failures gracefully", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Failed to process image" }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Failed to process image");
            });

            it("should handle image not found", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Image file not found" }
                });

                const input = createMockInput({
                    imageSource: "/path/nonexistent.png",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow("Image file not found");
            });

            it("should handle corrupted image files", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: false,
                    error: { message: "Failed to decode image: corrupted file" }
                });

                const input = createMockInput({
                    imageSource: "/path/corrupted.png",
                    outputVariable: "result"
                });

                await expect(handler.execute(input)).rejects.toThrow(
                    "Failed to decode image: corrupted file"
                );
            });
        });

        describe("edge cases", () => {
            it("should handle image with no text", async () => {
                mockExecute.mockResolvedValueOnce({
                    success: true,
                    data: {
                        text: "",
                        confidence: 0,
                        lineCount: 0,
                        wordCount: 0,
                        characterCount: 0,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/blank.png",
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
                        confidence: 90.0,
                        lineCount: 1,
                        wordCount: 3,
                        characterCount: 13,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png"
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
                        confidence: 90.0,
                        lineCount: 1,
                        wordCount: 1,
                        characterCount: 4,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
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
                        confidence: 90.0,
                        lineCount: 1,
                        wordCount: 1,
                        characterCount: 4,
                        language: "eng"
                    }
                });

                const input = createMockInput({
                    imageSource: "/path/image.png",
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
