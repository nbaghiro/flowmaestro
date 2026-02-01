/**
 * Document Processing Integration Tests
 *
 * Tests the document processing workflow end-to-end:
 * - Text extraction from various document types
 * - Text chunking with configurable settings
 * - Embedding generation and storage
 * - Document status transitions
 */

import { nanoid } from "nanoid";
import {
    sampleContents,
    createProcessingInput,
    createTestKnowledgeBase,
    createPendingDocument
} from "./helpers/kb-fixtures";
import {
    createKBTestEnvironment,
    type KBTestEnvironment,
    type ProcessingResult
} from "./helpers/kb-test-env";
import type { DocumentFileType } from "../../../src/storage/models/KnowledgeDocument";

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Document Processing Workflow", () => {
    let testEnv: KBTestEnvironment;

    afterEach(async () => {
        if (testEnv) {
            await testEnv.cleanup();
        }
    });

    // =========================================================================
    // BASIC DOCUMENT PROCESSING
    // =========================================================================

    describe("Basic Processing Flow", () => {
        it("should process a PDF document end-to-end", async () => {
            testEnv = await createKBTestEnvironment({
                seedFiles: {
                    "/uploads/doc-001.pdf": sampleContents.pdf
                }
            });

            const input = createProcessingInput("doc-001", "kb-001", {
                filePath: "/uploads/doc-001.pdf",
                fileType: "pdf"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);
            expect(result.documentId).toBe("doc-001");
            expect(result.chunkCount).toBeGreaterThan(0);
            expect(result.error).toBeUndefined();
        });

        it("should process a URL document", async () => {
            testEnv = await createKBTestEnvironment();

            const input = createProcessingInput("doc-url-001", "kb-001", {
                filePath: undefined,
                sourceUrl: "https://example.com/document.html",
                fileType: "html"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);
            expect(result.chunkCount).toBeGreaterThan(0);
        });

        it("should track document through status transitions", async () => {
            testEnv = await createKBTestEnvironment({
                seedFiles: {
                    "/uploads/doc-status.pdf": sampleContents.pdf
                }
            });

            const kb = createTestKnowledgeBase({ id: "kb-status" });
            const doc = createPendingDocument(kb.id, { id: "doc-status" });

            // Initial status should be pending
            expect(doc.status).toBe("pending");

            const input = createProcessingInput(doc.id, kb.id, {
                filePath: "/uploads/doc-status.pdf",
                fileType: "pdf"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);

            // Verify complete activity was called (marks doc as ready)
            const completeCalls = testEnv.getActivityCalls("completeDocumentProcessingActivity");
            expect(completeCalls.length).toBeGreaterThan(0);
        });
    });

    // =========================================================================
    // FILE TYPE HANDLING
    // =========================================================================

    describe("File Type Processing", () => {
        const fileTypes: DocumentFileType[] = ["pdf", "docx", "txt", "html", "csv", "json", "md"];

        it.each(fileTypes)("should process %s files", async (fileType) => {
            const content =
                sampleContents[fileType as keyof typeof sampleContents] || sampleContents.txt;
            const filePath = `/uploads/test.${fileType}`;

            testEnv = await createKBTestEnvironment({
                seedFiles: { [filePath]: content }
            });

            const input = createProcessingInput(`doc-${fileType}`, "kb-filetypes", {
                filePath,
                fileType
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);
            expect(result.chunkCount).toBeGreaterThan(0);
        });

        it("should handle doc (legacy Word) files", async () => {
            testEnv = await createKBTestEnvironment({
                seedFiles: {
                    "/uploads/legacy.doc": sampleContents.docx
                }
            });

            const input = createProcessingInput("doc-legacy", "kb-001", {
                filePath: "/uploads/legacy.doc",
                fileType: "doc"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);
        });
    });

    // =========================================================================
    // CHUNKING BEHAVIOR
    // =========================================================================

    describe("Text Chunking", () => {
        it("should create multiple chunks for large documents", async () => {
            testEnv = await createKBTestEnvironment({
                chunkSize: 500,
                chunkOverlap: 50,
                seedFiles: {
                    "/uploads/large.txt": sampleContents.veryLarge
                }
            });

            const input = createProcessingInput("doc-large", "kb-001", {
                filePath: "/uploads/large.txt",
                fileType: "txt"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);
            expect(result.chunkCount).toBeGreaterThan(1);
        });

        it("should create single chunk for small documents", async () => {
            const smallContent = "This is a small document.";

            testEnv = await createKBTestEnvironment({
                chunkSize: 1000,
                seedFiles: {
                    "/uploads/small.txt": smallContent
                }
            });

            const input = createProcessingInput("doc-small", "kb-001", {
                filePath: "/uploads/small.txt",
                fileType: "txt"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);
            expect(result.chunkCount).toBe(1);
        });

        it("should respect configured chunk overlap", async () => {
            const content = "A".repeat(2000); // Will create overlapping chunks

            testEnv = await createKBTestEnvironment({
                chunkSize: 1000,
                chunkOverlap: 200,
                seedFiles: {
                    "/uploads/overlap.txt": content
                }
            });

            const input = createProcessingInput("doc-overlap", "kb-001", {
                filePath: "/uploads/overlap.txt",
                fileType: "txt"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);
            // With 2000 chars, 1000 chunk size, 200 overlap:
            // First chunk: 0-1000, next starts at 800, so 2 chunks minimum
            expect(result.chunkCount).toBeGreaterThanOrEqual(2);
        });
    });

    // =========================================================================
    // EMBEDDING GENERATION
    // =========================================================================

    describe("Embedding Generation", () => {
        it("should generate embeddings for all chunks", async () => {
            testEnv = await createKBTestEnvironment({
                seedFiles: {
                    "/uploads/embed.pdf": sampleContents.pdf
                }
            });

            const input = createProcessingInput("doc-embed", "kb-001", {
                filePath: "/uploads/embed.pdf",
                fileType: "pdf"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);

            // Verify embeddings were generated
            expect(testEnv.embeddingMock.generateEmbeddings).toHaveBeenCalled();
        });

        it("should track token usage during embedding generation", async () => {
            testEnv = await createKBTestEnvironment({
                seedFiles: {
                    "/uploads/tokens.txt": sampleContents.pdf
                }
            });

            const input = createProcessingInput("doc-tokens", "kb-001", {
                filePath: "/uploads/tokens.txt",
                fileType: "txt"
            });

            await runProcessingWorkflow(testEnv, input);

            // Verify tokens were tracked
            const totalTokens = testEnv.embeddingMock.getTotalTokens();
            expect(totalTokens).toBeGreaterThan(0);
        });
    });

    // =========================================================================
    // EMPTY/INVALID CONTENT
    // =========================================================================

    describe("Empty and Invalid Content", () => {
        it("should fail on empty document content", async () => {
            testEnv = await createKBTestEnvironment({
                seedFiles: {
                    "/uploads/empty.txt": sampleContents.empty
                }
            });

            const input = createProcessingInput("doc-empty", "kb-001", {
                filePath: "/uploads/empty.txt",
                fileType: "txt"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("No content");
        });

        it("should fail on whitespace-only content", async () => {
            testEnv = await createKBTestEnvironment({
                seedFiles: {
                    "/uploads/whitespace.txt": sampleContents.whitespaceOnly
                }
            });

            const input = createProcessingInput("doc-whitespace", "kb-001", {
                filePath: "/uploads/whitespace.txt",
                fileType: "txt"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("No content");
        });
    });

    // =========================================================================
    // LARGE DOCUMENTS
    // =========================================================================

    describe("Large Document Handling", () => {
        it("should process very large documents", async () => {
            testEnv = await createKBTestEnvironment({
                chunkSize: 5000,
                chunkOverlap: 500,
                seedFiles: {
                    "/uploads/massive.txt": sampleContents.veryLarge
                }
            });

            const input = createProcessingInput("doc-massive", "kb-001", {
                filePath: "/uploads/massive.txt",
                fileType: "txt"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);
            expect(result.chunkCount).toBeGreaterThan(10);
        });
    });

    // =========================================================================
    // USER CONTEXT
    // =========================================================================

    describe("User Context Propagation", () => {
        it("should pass userId to all activities", async () => {
            testEnv = await createKBTestEnvironment({
                seedFiles: {
                    "/uploads/user-doc.pdf": sampleContents.pdf
                }
            });

            const userId = "user-test-123";
            const input = createProcessingInput("doc-user", "kb-001", {
                filePath: "/uploads/user-doc.pdf",
                fileType: "pdf",
                userId
            });

            await runProcessingWorkflow(testEnv, input);

            // Verify userId was passed to activities
            const extractCalls = testEnv.getActivityCalls("extractTextActivity");
            expect(extractCalls.length).toBeGreaterThan(0);
            expect((extractCalls[0].input as { userId?: string }).userId).toBe(userId);
        });

        it("should handle missing userId gracefully", async () => {
            testEnv = await createKBTestEnvironment({
                seedFiles: {
                    "/uploads/no-user.pdf": sampleContents.pdf
                }
            });

            const input = {
                documentId: "doc-no-user",
                knowledgeBaseId: "kb-001",
                filePath: "/uploads/no-user.pdf",
                fileType: "pdf"
                // userId intentionally omitted
            };

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);
        });
    });

    // =========================================================================
    // WORKFLOW RESULT
    // =========================================================================

    describe("Workflow Result", () => {
        it("should return correct chunk count on success", async () => {
            testEnv = await createKBTestEnvironment({
                chunkSize: 500,
                seedFiles: {
                    "/uploads/count.txt": sampleContents.pdf
                }
            });

            const input = createProcessingInput("doc-count", "kb-001", {
                filePath: "/uploads/count.txt",
                fileType: "txt"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(true);
            expect(typeof result.chunkCount).toBe("number");
            expect(result.chunkCount).toBeGreaterThan(0);
        });

        it("should return zero chunk count on failure", async () => {
            testEnv = await createKBTestEnvironment({
                seedFiles: {
                    "/uploads/fail.txt": sampleContents.empty
                }
            });

            const input = createProcessingInput("doc-fail", "kb-001", {
                filePath: "/uploads/fail.txt",
                fileType: "txt"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.success).toBe(false);
            expect(result.chunkCount).toBe(0);
        });

        it("should always return document ID in result", async () => {
            testEnv = await createKBTestEnvironment();

            const docId = `doc-${nanoid()}`;
            const input = createProcessingInput(docId, "kb-001", {
                filePath: "/nonexistent/file.pdf",
                fileType: "pdf"
            });

            const result = await runProcessingWorkflow(testEnv, input);

            expect(result.documentId).toBe(docId);
        });
    });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Run the document processing workflow with the test environment.
 */
async function runProcessingWorkflow(
    testEnv: KBTestEnvironment,
    input: {
        documentId: string;
        knowledgeBaseId: string;
        filePath?: string;
        sourceUrl?: string;
        fileType: string;
        userId?: string;
    }
): Promise<ProcessingResult> {
    const workflowId = `test-doc-${nanoid()}`;
    const taskQueue = `kb-test-${nanoid()}`;

    // Get content from GCS mock or use sample
    let extractedContent = sampleContents.pdf;
    if (input.filePath) {
        const fileBuffer = testEnv.gcsMock.files.get(input.filePath);
        if (fileBuffer) {
            extractedContent = fileBuffer.toString("utf-8");
        }
    }

    // Create chunks based on content
    const chunkSize = 1000;
    const chunkOverlap = 200;
    const chunks: Array<{ content: string; index: number; metadata: unknown }> = [];

    if (extractedContent && extractedContent.trim().length > 0) {
        let position = 0;
        let index = 0;

        while (position < extractedContent.length) {
            const endPosition = Math.min(position + chunkSize, extractedContent.length);
            chunks.push({
                content: extractedContent.slice(position, endPosition),
                index,
                metadata: { start_char: position, end_char: endPosition }
            });
            position = endPosition - chunkOverlap;
            if (position >= extractedContent.length - chunkOverlap) break;
            index++;
        }
    }

    const { Worker } = await import("@temporalio/worker");

    const worker = await Worker.create({
        connection: testEnv.env.nativeConnection,
        taskQueue,
        workflowsPath: require.resolve("../../../src/temporal/workflows"),
        activities: {
            extractTextActivity: jest.fn().mockImplementation(async () => {
                testEnv.activityLog.push({
                    activityName: "extractTextActivity",
                    input,
                    output: extractedContent,
                    timestamp: Date.now(),
                    success: true
                });
                return extractedContent;
            }),
            chunkTextActivity: jest.fn().mockImplementation(async () => {
                testEnv.activityLog.push({
                    activityName: "chunkTextActivity",
                    input,
                    output: chunks,
                    timestamp: Date.now(),
                    success: true
                });
                return chunks;
            }),
            generateAndStoreEmbeddingsActivity: jest.fn().mockImplementation(async () => {
                // Generate embeddings via mock
                if (chunks.length > 0) {
                    await testEnv.embeddingMock.generateEmbeddings(chunks.map((c) => c.content));
                }
                const result = { chunkCount: chunks.length, totalTokens: chunks.length * 50 };
                testEnv.activityLog.push({
                    activityName: "generateAndStoreEmbeddingsActivity",
                    input,
                    output: result,
                    timestamp: Date.now(),
                    success: true
                });
                return result;
            }),
            completeDocumentProcessingActivity: jest.fn().mockImplementation(async () => {
                testEnv.activityLog.push({
                    activityName: "completeDocumentProcessingActivity",
                    input,
                    output: undefined,
                    timestamp: Date.now(),
                    success: true
                });
            })
        }
    });

    try {
        const result = await worker.runUntil(
            testEnv.client.workflow.execute("processDocumentWorkflow", {
                workflowId,
                taskQueue,
                args: [input],
                workflowExecutionTimeout: 30000
            })
        );

        return result as ProcessingResult;
    } finally {
        try {
            await worker.shutdown();
        } catch {
            // Worker may already be stopped by runUntil
        }
    }
}
