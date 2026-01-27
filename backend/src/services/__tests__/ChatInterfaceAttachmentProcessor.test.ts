/**
 * Chat Interface Attachment Processor Tests
 *
 * Tests for processing file attachments for chat interface RAG.
 */

import type { ChatMessageAttachment } from "@flowmaestro/shared";

// Mock dependencies
const mockDownloadToTemp = jest.fn();
const mockExtractFromFile = jest.fn();
const mockExtractFromURL = jest.fn();
const mockChunkText = jest.fn();
const mockGenerateEmbeddings = jest.fn();
const mockCreateChunks = jest.fn();
const mockUnlink = jest.fn();

jest.mock("fs/promises", () => ({
    unlink: (...args: unknown[]) => mockUnlink(...args)
}));

jest.mock("../GCSStorageService", () => ({
    GCSStorageService: jest.fn().mockImplementation(() => ({
        downloadToTemp: mockDownloadToTemp
    }))
}));

jest.mock("../embeddings/TextExtractor", () => ({
    TextExtractor: jest.fn().mockImplementation(() => ({
        extractFromFile: mockExtractFromFile,
        extractFromURL: mockExtractFromURL
    }))
}));

jest.mock("../embeddings/TextChunker", () => ({
    TextChunker: jest.fn().mockImplementation(() => ({
        chunkText: mockChunkText
    }))
}));

jest.mock("../embeddings/EmbeddingService", () => ({
    EmbeddingService: jest.fn().mockImplementation(() => ({
        generateEmbeddings: mockGenerateEmbeddings
    }))
}));

jest.mock("../../storage/repositories/ChatInterfaceMessageChunkRepository", () => ({
    ChatInterfaceMessageChunkRepository: jest.fn().mockImplementation(() => ({
        createChunks: mockCreateChunks
    }))
}));

jest.mock("../../core/logging", () => ({
    createServiceLogger: jest.fn(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }))
}));

import { ChatInterfaceAttachmentProcessor } from "../ChatInterfaceAttachmentProcessor";

describe("ChatInterfaceAttachmentProcessor", () => {
    let processor: ChatInterfaceAttachmentProcessor;

    beforeEach(() => {
        jest.clearAllMocks();
        processor = new ChatInterfaceAttachmentProcessor();

        // Default successful mocks
        mockDownloadToTemp.mockResolvedValue("/tmp/test-file.pdf");
        mockUnlink.mockResolvedValue(undefined);
        mockExtractFromFile.mockResolvedValue({
            content: "This is the extracted text content from the file.",
            metadata: { pages: 1, wordCount: 9 }
        });
        mockChunkText.mockReturnValue([
            {
                content: "This is the extracted text content from the file.",
                index: 0,
                metadata: { start_char: 0, end_char: 49, sentence_count: 1 }
            }
        ]);
        mockGenerateEmbeddings.mockResolvedValue({
            embeddings: [[0.1, 0.2, 0.3]],
            model: "text-embedding-3-small",
            usage: { prompt_tokens: 10, total_tokens: 10 }
        });
        mockCreateChunks.mockResolvedValue([]);
    });

    describe("processAttachments", () => {
        it("should process file attachments successfully", async () => {
            const attachments: ChatMessageAttachment[] = [
                {
                    type: "file",
                    fileName: "document.pdf",
                    mimeType: "application/pdf",
                    gcsUri: "gs://test-bucket/user/document.pdf",
                    fileSize: 1024
                }
            ];

            const results = await processor.processAttachments({
                attachments,
                sessionId: "session-123",
                threadId: "thread-123",
                userId: "user-123"
            });

            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
            expect(results[0].fileName).toBe("document.pdf");
            expect(results[0].chunksCreated).toBe(1);

            // Verify processing pipeline was called
            expect(mockDownloadToTemp).toHaveBeenCalledWith({
                gcsUri: "gs://test-bucket/user/document.pdf"
            });
            expect(mockExtractFromFile).toHaveBeenCalledWith("/tmp/test-file.pdf", "pdf");
            expect(mockChunkText).toHaveBeenCalled();
            expect(mockGenerateEmbeddings).toHaveBeenCalled();
            expect(mockCreateChunks).toHaveBeenCalled();
            expect(mockUnlink).toHaveBeenCalledWith("/tmp/test-file.pdf");
        });

        it("should process URL attachments successfully", async () => {
            const attachments: ChatMessageAttachment[] = [
                {
                    type: "url",
                    url: "https://example.com/article"
                }
            ];

            mockExtractFromURL.mockResolvedValue({
                content: "Article content from the web page.",
                metadata: { title: "Example Article" }
            });

            const results = await processor.processAttachments({
                attachments,
                sessionId: "session-123",
                threadId: "thread-123"
            });

            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
            expect(results[0].fileName).toBe("https://example.com/article");
            expect(mockExtractFromURL).toHaveBeenCalledWith("https://example.com/article");
        });

        it("should skip unsupported file types gracefully", async () => {
            const attachments: ChatMessageAttachment[] = [
                {
                    type: "file",
                    fileName: "image.png",
                    mimeType: "image/png",
                    gcsUri: "gs://test-bucket/user/image.png"
                }
            ];

            const results = await processor.processAttachments({
                attachments,
                sessionId: "session-123"
            });

            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
            expect(results[0].chunksCreated).toBe(0);
            expect(results[0].error).toContain("Unsupported file type");

            // Should not attempt to download unsupported files
            expect(mockDownloadToTemp).not.toHaveBeenCalled();
        });

        it("should handle extraction errors gracefully", async () => {
            mockExtractFromFile.mockRejectedValue(new Error("Extraction failed"));

            const attachments: ChatMessageAttachment[] = [
                {
                    type: "file",
                    fileName: "corrupted.pdf",
                    mimeType: "application/pdf",
                    gcsUri: "gs://test-bucket/user/corrupted.pdf"
                }
            ];

            const results = await processor.processAttachments({
                attachments,
                sessionId: "session-123"
            });

            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(false);
            expect(results[0].error).toBe("Extraction failed");

            // Should still cleanup temp file
            expect(mockUnlink).toHaveBeenCalled();
        });

        it("should handle empty extracted content", async () => {
            mockExtractFromFile.mockResolvedValue({
                content: "",
                metadata: {}
            });

            const attachments: ChatMessageAttachment[] = [
                {
                    type: "file",
                    fileName: "empty.pdf",
                    mimeType: "application/pdf",
                    gcsUri: "gs://test-bucket/user/empty.pdf"
                }
            ];

            const results = await processor.processAttachments({
                attachments,
                sessionId: "session-123"
            });

            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
            expect(results[0].chunksCreated).toBe(0);
            expect(results[0].error).toContain("No text content");
        });

        it("should process multiple attachments", async () => {
            const attachments: ChatMessageAttachment[] = [
                {
                    type: "file",
                    fileName: "doc1.pdf",
                    mimeType: "application/pdf",
                    gcsUri: "gs://test-bucket/user/doc1.pdf"
                },
                {
                    type: "file",
                    fileName: "doc2.txt",
                    mimeType: "text/plain",
                    gcsUri: "gs://test-bucket/user/doc2.txt"
                }
            ];

            const results = await processor.processAttachments({
                attachments,
                sessionId: "session-123"
            });

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
            expect(mockDownloadToTemp).toHaveBeenCalledTimes(2);
        });

        it("should return error for file attachment without gcsUri", async () => {
            const attachments: ChatMessageAttachment[] = [
                {
                    type: "file",
                    fileName: "document.pdf"
                    // Missing gcsUri
                }
            ];

            const results = await processor.processAttachments({
                attachments,
                sessionId: "session-123"
            });

            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(false);
            expect(results[0].error).toContain("Invalid attachment");
        });

        it("should detect file type from extension when MIME type is missing", async () => {
            const attachments: ChatMessageAttachment[] = [
                {
                    type: "file",
                    fileName: "document.docx",
                    // No mimeType provided
                    gcsUri: "gs://test-bucket/user/document.docx"
                }
            ];

            const results = await processor.processAttachments({
                attachments,
                sessionId: "session-123"
            });

            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
            expect(mockExtractFromFile).toHaveBeenCalledWith("/tmp/test-file.pdf", "docx");
        });

        it("should pass chunks with correct structure to repository", async () => {
            const attachments: ChatMessageAttachment[] = [
                {
                    type: "file",
                    fileName: "document.pdf",
                    mimeType: "application/pdf",
                    gcsUri: "gs://test-bucket/user/document.pdf"
                }
            ];

            await processor.processAttachments({
                attachments,
                sessionId: "session-123",
                threadId: "thread-456"
            });

            expect(mockCreateChunks).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        sessionId: "session-123",
                        threadId: "thread-456",
                        sourceType: "file",
                        sourceName: "document.pdf",
                        sourceIndex: 0,
                        chunkIndex: 0,
                        embedding: [0.1, 0.2, 0.3]
                    })
                ])
            );
        });
    });
});
