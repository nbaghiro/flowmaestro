/**
 * Files Node Handler Unit Tests
 *
 * Tests files node handler with mocked external dependencies:
 * - GCS storage service mocked
 * - Text extractor mocked
 * - Text chunker mocked
 * - File system operations mocked
 */

// Mock GCS storage service
const mockDownloadToTemp = jest.fn();
jest.mock("../../../../../services/GCSStorageService", () => ({
    getUploadsStorageService: jest.fn().mockReturnValue({
        downloadToTemp: mockDownloadToTemp
    })
}));

// Mock TextExtractor
const mockExtractFromFile = jest.fn();
jest.mock("../../../../../services/embeddings/TextExtractor", () => ({
    TextExtractor: jest.fn().mockImplementation(() => ({
        extractFromFile: mockExtractFromFile
    }))
}));

// Mock TextChunker
const mockChunkText = jest.fn();
jest.mock("../../../../../services/embeddings/TextChunker", () => ({
    TextChunker: jest.fn().mockImplementation(() => ({
        chunkText: mockChunkText
    }))
}));

// Mock fs/promises for temp file cleanup
jest.mock("fs/promises", () => ({
    unlink: jest.fn().mockResolvedValue(undefined)
}));

import type { FileInputData, JsonObject } from "@flowmaestro/shared";
import {
    createTestContext,
    createTestMetadata
} from "../../../../../../__tests__/helpers/handler-test-utils";
import { FilesNodeHandler, createFilesNodeHandler } from "../inputs/files";
import type { ContextSnapshot } from "../../../../../temporal/core/types";

// Helper to create handler input
function createHandlerInput(
    overrides: {
        nodeType?: string;
        nodeConfig?: Record<string, unknown>;
        context?: ContextSnapshot;
    } = {}
) {
    const defaultConfig = {
        inputName: "documents",
        outputVariable: "processedFiles",
        required: false,
        chunkSize: 1000,
        chunkOverlap: 200
    };

    return {
        nodeType: overrides.nodeType || "files",
        nodeConfig: { ...defaultConfig, ...overrides.nodeConfig },
        context: overrides.context || createTestContext(),
        metadata: createTestMetadata({ nodeId: "test-files-node" })
    };
}

// Helper to create file input data
function createFileInput(overrides: Partial<FileInputData> = {}): FileInputData {
    return {
        fileName: "test-document.pdf",
        fileType: "pdf",
        gcsUri: "gs://flowmaestro-uploads/user123/workflow456/test-document.pdf",
        ...overrides
    };
}

describe("FilesNodeHandler", () => {
    let handler: FilesNodeHandler;

    beforeEach(() => {
        handler = createFilesNodeHandler();
        jest.clearAllMocks();

        // Default mock implementations
        mockDownloadToTemp.mockResolvedValue("/tmp/flowmaestro-temp-123456");
        mockExtractFromFile.mockResolvedValue({
            content: "Extracted text content from the document.",
            metadata: { wordCount: 7, pages: 1 }
        });
        mockChunkText.mockReturnValue([
            {
                content: "Extracted text content",
                metadata: { start_char: 0, end_char: 22, sentence_count: 1 }
            },
            {
                content: "from the document.",
                metadata: { start_char: 23, end_char: 41, sentence_count: 1 }
            }
        ]);
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("FilesNodeHandler");
        });

        it("supports files node type", () => {
            expect(handler.supportedNodeTypes).toContain("files");
        });

        it("can handle files type", () => {
            expect(handler.canHandle("files")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("input")).toBe(false);
            expect(handler.canHandle("url")).toBe(false);
            expect(handler.canHandle("fileOperations")).toBe(false);
        });
    });

    describe("file input handling", () => {
        it("throws error when required files input is missing", async () => {
            const context = createTestContext({
                inputs: {} // No files input
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    inputName: "documents",
                    outputVariable: "result",
                    required: true
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(
                /Required files input 'documents' was not provided/
            );
        });

        it("returns empty result for optional files input", async () => {
            const context = createTestContext({
                inputs: {} // No files input
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    inputName: "documents",
                    outputVariable: "processedFiles",
                    required: false
                }
            });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;

            expect(result.files).toEqual([]);
            expect(result.allChunks).toEqual([]);
            expect(result.combinedText).toBe("");
            expect(result.fileCount).toBe(0);
            expect(result.totalChunkCount).toBe(0);
        });

        it("accepts array of file inputs", async () => {
            const fileInputs = [
                createFileInput({ fileName: "doc1.pdf" }),
                createFileInput({ fileName: "doc2.pdf" })
            ];

            const context = createTestContext({
                inputs: { documents: fileInputs as unknown as JsonObject }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    inputName: "documents",
                    outputVariable: "processedFiles"
                }
            });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;

            expect(result.fileCount).toBe(2);
            expect(mockDownloadToTemp).toHaveBeenCalledTimes(2);
        });

        it("accepts single file input", async () => {
            const fileInput = createFileInput();

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    inputName: "documents",
                    outputVariable: "processedFiles"
                }
            });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;

            expect(result.fileCount).toBe(1);
        });
    });

    describe("file type validation", () => {
        it("allows all file types when no restrictions set", async () => {
            const fileInputs = [
                createFileInput({ fileName: "doc.pdf", fileType: "pdf" }),
                createFileInput({ fileName: "doc.docx", fileType: "docx" }),
                createFileInput({ fileName: "data.csv", fileType: "csv" })
            ];

            const context = createTestContext({
                inputs: { documents: fileInputs as unknown as JsonObject }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    inputName: "documents",
                    outputVariable: "processedFiles"
                    // No allowedFileTypes specified
                }
            });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;

            expect(result.fileCount).toBe(3);
        });

        it("rejects disallowed file types", async () => {
            const fileInput = createFileInput({ fileName: "image.png", fileType: "png" });

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    inputName: "documents",
                    outputVariable: "processedFiles",
                    allowedFileTypes: ["pdf", "docx", "txt"]
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(
                /File type 'png' is not allowed.*Allowed types: pdf, docx, txt/
            );
        });

        it("allows specified file types", async () => {
            const fileInput = createFileInput({ fileName: "document.pdf", fileType: "pdf" });

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    inputName: "documents",
                    outputVariable: "processedFiles",
                    allowedFileTypes: ["pdf", "docx"]
                }
            });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;

            expect(result.fileCount).toBe(1);
        });
    });

    describe("file processing", () => {
        it("downloads file from GCS to temp location", async () => {
            const fileInput = createFileInput({
                gcsUri: "gs://bucket/path/to/file.pdf"
            });

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            await handler.execute(input);

            expect(mockDownloadToTemp).toHaveBeenCalledWith({
                gcsUri: "gs://bucket/path/to/file.pdf"
            });
        });

        it("extracts text from PDF files", async () => {
            mockExtractFromFile.mockResolvedValue({
                content: "PDF document content with multiple pages.",
                metadata: { wordCount: 6, pages: 3 }
            });

            const fileInput = createFileInput({ fileType: "pdf" });

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;
            const files = result.files as Array<{ extractedText: string }>;

            expect(mockExtractFromFile).toHaveBeenCalledWith("/tmp/flowmaestro-temp-123456", "pdf");
            expect(files[0].extractedText).toBe("PDF document content with multiple pages.");
        });

        it("extracts text from DOCX files", async () => {
            mockExtractFromFile.mockResolvedValue({
                content: "Word document content.",
                metadata: { wordCount: 3, pages: 1 }
            });

            const fileInput = createFileInput({ fileName: "report.docx", fileType: "docx" });

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            await handler.execute(input);

            expect(mockExtractFromFile).toHaveBeenCalledWith(
                "/tmp/flowmaestro-temp-123456",
                "docx"
            );
        });

        it("extracts text from TXT files", async () => {
            mockExtractFromFile.mockResolvedValue({
                content: "Plain text file content.",
                metadata: { wordCount: 4, pages: 1 }
            });

            const fileInput = createFileInput({ fileName: "notes.txt", fileType: "txt" });

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            await handler.execute(input);

            expect(mockExtractFromFile).toHaveBeenCalledWith("/tmp/flowmaestro-temp-123456", "txt");
        });

        it("chunks extracted text based on config", async () => {
            mockChunkText.mockReturnValue([
                { content: "Chunk 1", metadata: { start_char: 0, end_char: 7 } },
                { content: "Chunk 2", metadata: { start_char: 8, end_char: 15 } },
                { content: "Chunk 3", metadata: { start_char: 16, end_char: 23 } }
            ]);

            const fileInput = createFileInput();

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    inputName: "documents",
                    outputVariable: "processedFiles",
                    chunkSize: 500,
                    chunkOverlap: 50
                }
            });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;

            expect(result.totalChunkCount).toBe(3);
            expect(mockChunkText).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    fileName: "test-document.pdf",
                    fileType: "pdf"
                })
            );
        });
    });

    describe("output structure", () => {
        it("returns processed files array", async () => {
            const fileInput = createFileInput({ fileName: "report.pdf" });

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;

            expect(Array.isArray(result.files)).toBe(true);
            const files = result.files as Array<{
                fileName: string;
                fileType: string;
                gcsUri: string;
                chunks: unknown[];
                extractedText: string;
            }>;
            expect(files).toHaveLength(1);
            expect(files[0].fileName).toBe("report.pdf");
            expect(files[0].fileType).toBe("pdf");
            expect(files[0].gcsUri).toBeDefined();
            expect(files[0].chunks).toBeDefined();
            expect(files[0].extractedText).toBeDefined();
        });

        it("includes all chunks across files", async () => {
            // First file has 2 chunks
            mockChunkText.mockReturnValueOnce([
                { content: "File1 Chunk1", metadata: { start_char: 0, end_char: 12 } },
                { content: "File1 Chunk2", metadata: { start_char: 13, end_char: 25 } }
            ]);
            // Second file has 3 chunks
            mockChunkText.mockReturnValueOnce([
                { content: "File2 Chunk1", metadata: { start_char: 0, end_char: 12 } },
                { content: "File2 Chunk2", metadata: { start_char: 13, end_char: 25 } },
                { content: "File2 Chunk3", metadata: { start_char: 26, end_char: 38 } }
            ]);

            const fileInputs = [
                createFileInput({ fileName: "doc1.pdf" }),
                createFileInput({ fileName: "doc2.pdf" })
            ];

            const context = createTestContext({
                inputs: { documents: fileInputs as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;

            expect(result.totalChunkCount).toBe(5);
            const allChunks = result.allChunks as unknown[];
            expect(allChunks).toHaveLength(5);
        });

        it("includes combined text from all files", async () => {
            mockExtractFromFile.mockResolvedValueOnce({
                content: "First document content.",
                metadata: { wordCount: 3, pages: 1 }
            });
            mockExtractFromFile.mockResolvedValueOnce({
                content: "Second document content.",
                metadata: { wordCount: 3, pages: 1 }
            });

            const fileInputs = [
                createFileInput({ fileName: "doc1.pdf" }),
                createFileInput({ fileName: "doc2.pdf" })
            ];

            const context = createTestContext({
                inputs: { documents: fileInputs as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;

            expect(result.combinedText).toContain("First document content.");
            expect(result.combinedText).toContain("Second document content.");
            expect(result.combinedText).toContain("---"); // Separator
        });

        it("includes file and chunk counts", async () => {
            mockChunkText.mockReturnValue([
                { content: "Chunk", metadata: { start_char: 0, end_char: 5 } }
            ]);

            const fileInputs = [
                createFileInput({ fileName: "doc1.pdf" }),
                createFileInput({ fileName: "doc2.pdf" }),
                createFileInput({ fileName: "doc3.pdf" })
            ];

            const context = createTestContext({
                inputs: { documents: fileInputs as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;

            expect(result.fileCount).toBe(3);
            expect(result.totalChunkCount).toBe(3); // 1 chunk per file
        });
    });

    describe("chunk configuration", () => {
        it("uses specified chunk size", async () => {
            const { TextChunker } = jest.requireMock(
                "../../../../../services/embeddings/TextChunker"
            );

            const fileInput = createFileInput();

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    inputName: "documents",
                    outputVariable: "processedFiles",
                    chunkSize: 2000
                }
            });

            await handler.execute(input);

            expect(TextChunker).toHaveBeenCalledWith(
                expect.objectContaining({
                    chunkSize: 2000
                })
            );
        });

        it("uses specified chunk overlap", async () => {
            const { TextChunker } = jest.requireMock(
                "../../../../../services/embeddings/TextChunker"
            );

            const fileInput = createFileInput();

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({
                context,
                nodeConfig: {
                    inputName: "documents",
                    outputVariable: "processedFiles",
                    chunkOverlap: 100
                }
            });

            await handler.execute(input);

            expect(TextChunker).toHaveBeenCalledWith(
                expect.objectContaining({
                    chunkOverlap: 100
                })
            );
        });

        it("includes chunk metadata", async () => {
            mockChunkText.mockReturnValue([
                {
                    content: "Chunk content",
                    metadata: {
                        start_char: 0,
                        end_char: 13,
                        sentence_count: 2
                    }
                }
            ]);

            const fileInput = createFileInput({ fileName: "doc.pdf", fileType: "pdf" });

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            const output = await handler.execute(input);
            const result = (output.result as JsonObject).processedFiles as JsonObject;
            const allChunks = result.allChunks as Array<{
                content: string;
                index: number;
                metadata: {
                    fileName: string;
                    fileType: string;
                    start_char: number;
                    end_char: number;
                };
            }>;

            expect(allChunks[0].metadata.fileName).toBe("doc.pdf");
            expect(allChunks[0].metadata.fileType).toBe("pdf");
            expect(allChunks[0].metadata.start_char).toBe(0);
            expect(allChunks[0].metadata.end_char).toBe(13);
        });
    });

    describe("error handling", () => {
        it("handles GCS download errors", async () => {
            mockDownloadToTemp.mockRejectedValue(new Error("GCS download failed: Access denied"));

            const fileInput = createFileInput();

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            await expect(handler.execute(input)).rejects.toThrow(/GCS download failed/);
        });

        it("handles text extraction errors", async () => {
            mockExtractFromFile.mockRejectedValue(new Error("Failed to parse PDF structure"));

            const fileInput = createFileInput();

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            await expect(handler.execute(input)).rejects.toThrow(/Failed to parse PDF/);
        });

        it("cleans up temp files on error", async () => {
            const fs = jest.requireMock("fs/promises");
            mockExtractFromFile.mockRejectedValue(new Error("Extraction failed"));

            const fileInput = createFileInput();

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            try {
                await handler.execute(input);
            } catch {
                // Expected to throw
            }

            // Verify temp file cleanup was attempted
            expect(fs.unlink).toHaveBeenCalledWith("/tmp/flowmaestro-temp-123456");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            const fileInput = createFileInput();

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records data size bytes", async () => {
            mockExtractFromFile.mockResolvedValue({
                content: "A".repeat(5000), // 5000 bytes
                metadata: { wordCount: 1000, pages: 2 }
            });

            const fileInput = createFileInput();

            const context = createTestContext({
                inputs: { documents: fileInput as unknown as JsonObject }
            });

            const input = createHandlerInput({ context });

            const output = await handler.execute(input);

            expect(output.metrics?.dataSizeBytes).toBe(5000);
        });
    });
});
