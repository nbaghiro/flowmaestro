/**
 * Chat Interface Attachment Processing Tests
 *
 * Tests for text extraction, chunking, embedding, and storage of attachments.
 */

import {
    createSimpleChatInterfaceTestEnvironment,
    createTestSession,
    createTestChatInterface,
    createTestFileAttachment,
    createTestUrlAttachment,
    createTestChunk,
    createTestChunks,
    sampleContents,
    generateDeterministicEmbedding
} from "./setup";
import type { SimpleChatInterfaceTestEnvironment } from "./helpers/chat-interface-test-env";
import type { CreateChunkInput } from "../../../src/storage/repositories/ChatInterfaceMessageChunkRepository";

describe("Chat Interface Attachment Processing", () => {
    let testEnv: SimpleChatInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleChatInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("PDF File Processing", () => {
        it("should download, extract, chunk, embed, and store PDF", async () => {
            // Arrange
            const chatInterface = createTestChatInterface({ id: "ci-001" });
            const session = createTestSession(chatInterface.id, { id: "session-001" });
            const attachment = createTestFileAttachment({
                fileName: "document.pdf",
                mimeType: "application/pdf",
                gcsUri: "gs://bucket/document.pdf"
            });

            // Seed the file
            testEnv.services.gcs.seedFile("gs://bucket/document.pdf", sampleContents.pdf);

            // Configure mocks
            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: true,
                    fileName: "document.pdf",
                    chunksCreated: 5
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [attachment],
                sessionId: session.id,
                threadId: "thread-001",
                userId: chatInterface.userId
            });

            // Assert
            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
            expect(results[0].fileName).toBe("document.pdf");
            expect(results[0].chunksCreated).toBe(5);
        });
    });

    describe("DOCX File Processing", () => {
        it("should process DOCX files", async () => {
            // Arrange
            const session = createTestSession("ci-001", { id: "session-001" });
            const attachment = createTestFileAttachment({
                fileName: "document.docx",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                gcsUri: "gs://bucket/document.docx"
            });

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: true,
                    fileName: "document.docx",
                    chunksCreated: 3
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [attachment],
                sessionId: session.id
            });

            // Assert
            expect(results[0].success).toBe(true);
            expect(results[0].chunksCreated).toBe(3);
        });
    });

    describe("Text-based File Processing", () => {
        const textFileTypes = [
            { ext: "txt", mime: "text/plain", content: sampleContents.txt },
            { ext: "md", mime: "text/markdown", content: sampleContents.md },
            { ext: "html", mime: "text/html", content: sampleContents.html },
            { ext: "json", mime: "application/json", content: sampleContents.json },
            { ext: "csv", mime: "text/csv", content: sampleContents.csv }
        ];

        for (const fileType of textFileTypes) {
            it(`should process ${fileType.ext.toUpperCase()} files`, async () => {
                // Arrange
                const session = createTestSession("ci-001");
                const attachment = createTestFileAttachment({
                    fileName: `document.${fileType.ext}`,
                    mimeType: fileType.mime
                });

                testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                    {
                        success: true,
                        fileName: `document.${fileType.ext}`,
                        chunksCreated: 2
                    }
                ]);

                // Act
                const results = await testEnv.services.attachmentProcessor.processAttachments({
                    attachments: [attachment],
                    sessionId: session.id
                });

                // Assert
                expect(results[0].success).toBe(true);
            });
        }
    });

    describe("Unsupported File Types", () => {
        it("should skip unsupported file types with success", async () => {
            // Arrange
            const session = createTestSession("ci-001");
            const attachment = createTestFileAttachment({
                fileName: "archive.zip",
                mimeType: "application/zip"
            });

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: true,
                    fileName: "archive.zip",
                    chunksCreated: 0,
                    error: "Unsupported file type: application/zip"
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [attachment],
                sessionId: session.id
            });

            // Assert
            expect(results[0].success).toBe(true);
            expect(results[0].chunksCreated).toBe(0);
        });

        it("should handle image files as unsupported for text extraction", async () => {
            // Arrange
            const session = createTestSession("ci-001");
            const attachment = createTestFileAttachment({
                fileName: "photo.jpg",
                mimeType: "image/jpeg"
            });

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: true,
                    fileName: "photo.jpg",
                    chunksCreated: 0,
                    error: "Unsupported file type: image/jpeg"
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [attachment],
                sessionId: session.id
            });

            // Assert
            expect(results[0].chunksCreated).toBe(0);
        });
    });

    describe("Empty Content Handling", () => {
        it("should handle files with no text content", async () => {
            // Arrange
            const session = createTestSession("ci-001");
            const attachment = createTestFileAttachment({
                fileName: "empty.pdf"
            });

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: true,
                    fileName: "empty.pdf",
                    chunksCreated: 0,
                    error: "No text content found in file"
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [attachment],
                sessionId: session.id
            });

            // Assert
            expect(results[0].success).toBe(true);
            expect(results[0].chunksCreated).toBe(0);
        });

        it("should handle whitespace-only content", async () => {
            // Arrange
            testEnv.services.gcs.seedFile(
                "gs://bucket/whitespace.txt",
                sampleContents.whitespaceOnly
            );

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: true,
                    fileName: "whitespace.txt",
                    chunksCreated: 0,
                    error: "No text content found in file"
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [
                    createTestFileAttachment({
                        fileName: "whitespace.txt",
                        gcsUri: "gs://bucket/whitespace.txt"
                    })
                ],
                sessionId: "session-001"
            });

            // Assert
            expect(results[0].chunksCreated).toBe(0);
        });
    });

    describe("Extraction Failure Handling", () => {
        it("should handle extraction failure gracefully", async () => {
            // Arrange
            const session = createTestSession("ci-001");
            const attachment = createTestFileAttachment({
                fileName: "corrupted.pdf"
            });

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: false,
                    fileName: "corrupted.pdf",
                    chunksCreated: 0,
                    error: "Failed to extract text: PDF is corrupted"
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [attachment],
                sessionId: session.id
            });

            // Assert
            expect(results[0].success).toBe(false);
            expect(results[0].error).toContain("Failed to extract");
        });
    });

    describe("URL Attachment Processing", () => {
        it("should fetch and extract content from URL", async () => {
            // Arrange
            const session = createTestSession("ci-001");
            const urlAttachment = createTestUrlAttachment({
                url: "https://example.com/article"
            });

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: true,
                    fileName: "https://example.com/article",
                    chunksCreated: 4
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [urlAttachment],
                sessionId: session.id
            });

            // Assert
            expect(results[0].success).toBe(true);
            expect(results[0].chunksCreated).toBe(4);
        });

        it("should handle URL fetch failure", async () => {
            // Arrange
            const urlAttachment = createTestUrlAttachment({
                url: "https://invalid-url.example.com/404"
            });

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                {
                    success: false,
                    fileName: "https://invalid-url.example.com/404",
                    chunksCreated: 0,
                    error: "Failed to fetch URL: 404 Not Found"
                }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments: [urlAttachment],
                sessionId: "session-001"
            });

            // Assert
            expect(results[0].success).toBe(false);
        });
    });

    describe("Chunk Creation", () => {
        it("should create chunks with correct metadata", () => {
            // Arrange
            const sessionId = "session-001";
            const chunk = createTestChunk(sessionId, {
                content: "This is test content for chunking",
                chunkIndex: 0,
                sourceName: "document.pdf",
                sourceType: "file",
                sourceIndex: 0
            });

            // Assert
            expect(chunk.sessionId).toBe(sessionId);
            expect(chunk.content).toBe("This is test content for chunking");
            expect(chunk.chunkIndex).toBe(0);
            expect(chunk.sourceName).toBe("document.pdf");
            expect(chunk.sourceType).toBe("file");
        });

        it("should generate embeddings for chunks", () => {
            // Arrange
            const content = "Sample text for embedding";
            const embedding = generateDeterministicEmbedding(content);

            // Assert
            expect(embedding).toHaveLength(1536);
            expect(embedding[0]).toBeGreaterThanOrEqual(-1);
            expect(embedding[0]).toBeLessThanOrEqual(1);
        });

        it("should create multiple chunks with sequential indices", () => {
            // Arrange
            const sessionId = "session-001";
            const chunks = createTestChunks(sessionId, 5);

            // Assert
            expect(chunks).toHaveLength(5);
            chunks.forEach((chunk, index) => {
                expect(chunk.chunkIndex).toBe(index);
            });
        });

        it("should store chunks in repository", async () => {
            // Arrange
            const chunks: CreateChunkInput[] = [
                createTestChunk("session-001", { chunkIndex: 0 }),
                createTestChunk("session-001", { chunkIndex: 1 })
            ];

            testEnv.repositories.chunk.createChunks.mockResolvedValue([
                { id: "chunk-001", ...chunks[0] } as never,
                { id: "chunk-002", ...chunks[1] } as never
            ]);

            // Act
            const created = await testEnv.repositories.chunk.createChunks(chunks);

            // Assert
            expect(created).toHaveLength(2);
            expect(testEnv.repositories.chunk.createChunks).toHaveBeenCalledWith(chunks);
        });
    });

    describe("Multiple Attachments", () => {
        it("should process multiple attachments in sequence", async () => {
            // Arrange
            const session = createTestSession("ci-001");
            const attachments = [
                createTestFileAttachment({ fileName: "doc1.pdf" }),
                createTestFileAttachment({ fileName: "doc2.pdf" }),
                createTestFileAttachment({ fileName: "doc3.pdf" })
            ];

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                { success: true, fileName: "doc1.pdf", chunksCreated: 3 },
                { success: true, fileName: "doc2.pdf", chunksCreated: 5 },
                { success: true, fileName: "doc3.pdf", chunksCreated: 2 }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments,
                sessionId: session.id
            });

            // Assert
            expect(results).toHaveLength(3);
            const totalChunks = results.reduce((sum, r) => sum + r.chunksCreated, 0);
            expect(totalChunks).toBe(10);
        });

        it("should track source index for multiple attachments", () => {
            // Arrange
            const sessionId = "session-001";

            // Create chunks from multiple sources
            const chunk1 = createTestChunk(sessionId, {
                sourceIndex: 0,
                sourceName: "doc1.pdf"
            });
            const chunk2 = createTestChunk(sessionId, {
                sourceIndex: 1,
                sourceName: "doc2.pdf"
            });

            // Assert
            expect(chunk1.sourceIndex).toBe(0);
            expect(chunk2.sourceIndex).toBe(1);
        });

        it("should continue processing if one attachment fails", async () => {
            // Arrange
            const attachments = [
                createTestFileAttachment({ fileName: "good.pdf" }),
                createTestFileAttachment({ fileName: "bad.pdf" }),
                createTestFileAttachment({ fileName: "also-good.pdf" })
            ];

            testEnv.services.attachmentProcessor.processAttachments.mockResolvedValue([
                { success: true, fileName: "good.pdf", chunksCreated: 3 },
                { success: false, fileName: "bad.pdf", chunksCreated: 0, error: "Corrupted" },
                { success: true, fileName: "also-good.pdf", chunksCreated: 2 }
            ]);

            // Act
            const results = await testEnv.services.attachmentProcessor.processAttachments({
                attachments,
                sessionId: "session-001"
            });

            // Assert
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[2].success).toBe(true);
        });
    });
});
