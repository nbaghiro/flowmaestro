/**
 * Error Handling Integration Tests
 *
 * Tests error scenarios in document processing:
 * - Text extraction failures
 * - Embedding API errors
 * - File handling errors
 * - URL fetch failures
 * - Status updates on failure
 *
 * Note: These tests use workflow simulation (like the existing document-processor.test.ts)
 * to test error handling logic without the overhead of full Temporal integration.
 */

import { nanoid } from "nanoid";
import { sampleContents, createProcessingInput } from "./helpers/kb-fixtures";

// ============================================================================
// TYPES
// ============================================================================

interface ProcessingResult {
    documentId: string;
    success: boolean;
    chunkCount: number;
    error?: string;
}

interface ChunkData {
    content: string;
    index: number;
    metadata: unknown;
}

interface MockActivityResults {
    extractTextResult: string | null;
    extractTextError: Error | null;
    chunkTextResult: ChunkData[];
    chunkTextError: Error | null;
    generateAndStoreResult: { chunkCount: number; totalTokens: number } | null;
    generateAndStoreError: Error | null;
    completeProcessingError: Error | null;
    completeProcessingCalled: boolean;
}

// ============================================================================
// MOCK ACTIVITY STATE
// ============================================================================

const mockActivityResults: MockActivityResults = {
    extractTextResult: null,
    extractTextError: null,
    chunkTextResult: [],
    chunkTextError: null,
    generateAndStoreResult: null,
    generateAndStoreError: null,
    completeProcessingError: null,
    completeProcessingCalled: false
};

function resetMocks(): void {
    mockActivityResults.extractTextResult = null;
    mockActivityResults.extractTextError = null;
    mockActivityResults.chunkTextResult = [];
    mockActivityResults.chunkTextError = null;
    mockActivityResults.generateAndStoreResult = null;
    mockActivityResults.generateAndStoreError = null;
    mockActivityResults.completeProcessingError = null;
    mockActivityResults.completeProcessingCalled = false;
}

// ============================================================================
// MOCK ACTIVITIES
// ============================================================================

const mockExtractTextActivity = jest.fn().mockImplementation(() => {
    if (mockActivityResults.extractTextError) {
        throw mockActivityResults.extractTextError;
    }
    return Promise.resolve(mockActivityResults.extractTextResult);
});

const mockChunkTextActivity = jest.fn().mockImplementation(() => {
    if (mockActivityResults.chunkTextError) {
        throw mockActivityResults.chunkTextError;
    }
    return Promise.resolve(mockActivityResults.chunkTextResult);
});

const mockGenerateAndStoreEmbeddingsActivity = jest.fn().mockImplementation(() => {
    if (mockActivityResults.generateAndStoreError) {
        throw mockActivityResults.generateAndStoreError;
    }
    return Promise.resolve(mockActivityResults.generateAndStoreResult);
});

const mockCompleteDocumentProcessingActivity = jest.fn().mockImplementation(() => {
    mockActivityResults.completeProcessingCalled = true;
    if (mockActivityResults.completeProcessingError) {
        throw mockActivityResults.completeProcessingError;
    }
    return Promise.resolve();
});

// ============================================================================
// WORKFLOW SIMULATION
// ============================================================================

/**
 * Simulates the document processor workflow execution with mock activities.
 * This mirrors the actual workflow logic without requiring Temporal infrastructure.
 */
async function simulateProcessDocumentWorkflow(input: {
    documentId: string;
    knowledgeBaseId: string;
    filePath?: string;
    sourceUrl?: string;
    fileType: string;
    userId?: string;
}): Promise<ProcessingResult> {
    try {
        // Step 1: Extract text from document
        const content = await mockExtractTextActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: input.fileType,
            userId: input.userId
        });

        if (!content || content.trim().length === 0) {
            throw new Error("No content extracted from document");
        }

        // Step 2: Chunk the text
        const chunks = await mockChunkTextActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            content
        });

        if (chunks.length === 0) {
            throw new Error("No chunks created from content");
        }

        // Step 3: Generate embeddings and store chunks
        const { chunkCount } = await mockGenerateAndStoreEmbeddingsActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            chunks
        });

        // Step 4: Mark document as ready
        await mockCompleteDocumentProcessingActivity({
            documentId: input.documentId
        });

        return {
            documentId: input.documentId,
            success: true,
            chunkCount
        };
    } catch (error: unknown) {
        return {
            documentId: input.documentId,
            success: false,
            chunkCount: 0,
            error:
                error instanceof Error ? error.message : "Unknown error while processing document"
        };
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTestChunks(count: number): ChunkData[] {
    return Array.from({ length: count }, (_, i) => ({
        content: `Chunk ${i + 1} content.`,
        index: i,
        metadata: { chunkIndex: i }
    }));
}

// ============================================================================
// TESTS
// ============================================================================

describe("Error Handling", () => {
    beforeEach(() => {
        resetMocks();
        jest.clearAllMocks();
    });

    // =========================================================================
    // EXTRACTION ERRORS
    // =========================================================================

    describe("Text Extraction Errors", () => {
        it("should mark document as failed on extraction error", async () => {
            mockActivityResults.extractTextError = new Error("File not found");

            const input = createProcessingInput("doc-extract-fail", "kb-001", {
                filePath: "/nonexistent/file.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("File not found");
            expect(result.chunkCount).toBe(0);
        });

        it("should handle unsupported file format error", async () => {
            mockActivityResults.extractTextError = new Error("Unsupported file format: xyz");

            const input = createProcessingInput("doc-unsupported", "kb-001", {
                filePath: "/uploads/file.xyz",
                fileType: "xyz" as string
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Unsupported file format");
        });

        it("should handle corrupted file error", async () => {
            mockActivityResults.extractTextError = new Error("File is corrupted or encrypted");

            const input = createProcessingInput("doc-corrupted", "kb-001", {
                filePath: "/uploads/corrupted.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("corrupted");
        });

        it("should handle encrypted PDF error", async () => {
            mockActivityResults.extractTextError = new Error("PDF is password protected");

            const input = createProcessingInput("doc-encrypted", "kb-001", {
                filePath: "/uploads/encrypted.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("password protected");
        });
    });

    // =========================================================================
    // EMBEDDING API ERRORS
    // =========================================================================

    describe("Embedding API Errors", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult = sampleContents.pdf;
            mockActivityResults.chunkTextResult = createTestChunks(3);
        });

        it("should mark document as failed on embedding API error", async () => {
            mockActivityResults.generateAndStoreError = new Error("Embedding API rate limited");

            const input = createProcessingInput("doc-embed-fail", "kb-001", {
                filePath: "/uploads/doc.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Embedding API rate limited");
        });

        it("should handle embedding service timeout", async () => {
            mockActivityResults.generateAndStoreError = new Error("Request timeout after 30000ms");

            const input = createProcessingInput("doc-timeout", "kb-001", {
                filePath: "/uploads/doc.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("timeout");
        });

        it("should handle invalid API key error", async () => {
            mockActivityResults.generateAndStoreError = new Error("Invalid API key");

            const input = createProcessingInput("doc-auth-fail", "kb-001", {
                filePath: "/uploads/doc.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("Invalid API key");
        });
    });

    // =========================================================================
    // URL FETCH ERRORS
    // =========================================================================

    describe("URL Fetch Errors", () => {
        it("should handle URL fetch timeout", async () => {
            mockActivityResults.extractTextError = new Error("URL fetch timeout after 30000ms");

            const input = createProcessingInput("doc-url-timeout", "kb-001", {
                filePath: undefined,
                sourceUrl: "https://slow-server.example.com/document",
                fileType: "html"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("timeout");
        });

        it("should handle 404 not found error", async () => {
            mockActivityResults.extractTextError = new Error("HTTP 404: Not Found");

            const input = createProcessingInput("doc-404", "kb-001", {
                filePath: undefined,
                sourceUrl: "https://example.com/nonexistent-page",
                fileType: "html"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("404");
        });

        it("should handle DNS resolution failure", async () => {
            mockActivityResults.extractTextError = new Error(
                "getaddrinfo ENOTFOUND nonexistent-domain-12345.com"
            );

            const input = createProcessingInput("doc-dns-fail", "kb-001", {
                filePath: undefined,
                sourceUrl: "https://nonexistent-domain-12345.com/doc",
                fileType: "html"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("ENOTFOUND");
        });

        it("should handle SSL certificate error", async () => {
            mockActivityResults.extractTextError = new Error("certificate has expired");

            const input = createProcessingInput("doc-ssl-fail", "kb-001", {
                filePath: undefined,
                sourceUrl: "https://expired-cert.example.com/doc",
                fileType: "html"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("certificate");
        });
    });

    // =========================================================================
    // CHUNKING ERRORS
    // =========================================================================

    describe("Chunking Errors", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult = sampleContents.txt;
        });

        it("should handle chunking configuration error", async () => {
            mockActivityResults.chunkTextError = new Error("Chunking configuration invalid");

            const input = createProcessingInput("doc-chunk-fail", "kb-001", {
                filePath: "/uploads/doc.txt",
                fileType: "txt"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Chunking configuration invalid");
        });

        it("should fail when no chunks created from content", async () => {
            mockActivityResults.chunkTextResult = []; // Empty chunks

            const input = createProcessingInput("doc-no-chunks", "kb-001", {
                filePath: "/uploads/doc.txt",
                fileType: "txt"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("No chunks");
        });
    });

    // =========================================================================
    // STORAGE ERRORS
    // =========================================================================

    describe("Storage Errors", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult = sampleContents.pdf;
            mockActivityResults.chunkTextResult = createTestChunks(3);
        });

        it("should handle database connection failure", async () => {
            mockActivityResults.generateAndStoreError = new Error("Database connection failed");

            const input = createProcessingInput("doc-db-fail", "kb-001", {
                filePath: "/uploads/doc.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database connection failed");
        });

        it("should handle storage quota exceeded error", async () => {
            mockActivityResults.generateAndStoreError = new Error("Storage quota exceeded");

            const input = createProcessingInput("doc-quota-fail", "kb-001", {
                filePath: "/uploads/doc.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("quota exceeded");
        });
    });

    // =========================================================================
    // COMPLETION ACTIVITY ERRORS
    // =========================================================================

    describe("Completion Activity Errors", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult = sampleContents.pdf;
            mockActivityResults.chunkTextResult = createTestChunks(3);
            mockActivityResults.generateAndStoreResult = { chunkCount: 3, totalTokens: 150 };
        });

        it("should handle failure to update document status", async () => {
            mockActivityResults.completeProcessingError = new Error(
                "Failed to update document status"
            );

            const input = createProcessingInput("doc-complete-fail", "kb-001", {
                filePath: "/uploads/doc.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed to update document status");
        });
    });

    // =========================================================================
    // ERROR MESSAGE PRESERVATION
    // =========================================================================

    describe("Error Message Preservation", () => {
        it("should preserve original error message in result", async () => {
            const errorMessage = "Specific error: invalid file header at byte 0x04";
            mockActivityResults.extractTextError = new Error(errorMessage);

            const input = createProcessingInput("doc-error-msg", "kb-001", {
                filePath: "/uploads/invalid.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.error).toBe(errorMessage);
        });

        it("should handle non-Error exceptions", async () => {
            mockActivityResults.extractTextError = "String error thrown" as unknown as Error;

            const input = createProcessingInput("doc-non-error", "kb-001", {
                filePath: "/uploads/doc.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    // =========================================================================
    // DOCUMENT STATE AFTER ERROR
    // =========================================================================

    describe("Document State After Error", () => {
        it("should not call complete activity when extraction fails", async () => {
            mockActivityResults.extractTextError = new Error("Extraction failed");

            const input = createProcessingInput("doc-no-complete", "kb-001", {
                filePath: "/uploads/doc.pdf",
                fileType: "pdf"
            });

            await simulateProcessDocumentWorkflow(input);

            expect(mockActivityResults.completeProcessingCalled).toBe(false);
        });

        it("should not call complete activity when chunking fails", async () => {
            mockActivityResults.extractTextResult = sampleContents.pdf;
            mockActivityResults.chunkTextError = new Error("Chunking failed");

            const input = createProcessingInput("doc-no-complete-chunk", "kb-001", {
                filePath: "/uploads/doc.pdf",
                fileType: "pdf"
            });

            await simulateProcessDocumentWorkflow(input);

            expect(mockActivityResults.completeProcessingCalled).toBe(false);
        });

        it("should not call complete activity when embedding fails", async () => {
            mockActivityResults.extractTextResult = sampleContents.pdf;
            mockActivityResults.chunkTextResult = createTestChunks(3);
            mockActivityResults.generateAndStoreError = new Error("Embedding failed");

            const input = createProcessingInput("doc-no-complete-embed", "kb-001", {
                filePath: "/uploads/doc.pdf",
                fileType: "pdf"
            });

            await simulateProcessDocumentWorkflow(input);

            expect(mockActivityResults.completeProcessingCalled).toBe(false);
        });
    });

    // =========================================================================
    // RESULT STRUCTURE ON FAILURE
    // =========================================================================

    describe("Result Structure on Failure", () => {
        it("should always return document ID even on failure", async () => {
            mockActivityResults.extractTextError = new Error("Failed");

            const docId = `doc-${nanoid()}`;
            const input = createProcessingInput(docId, "kb-001", {
                filePath: "/uploads/fail.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.documentId).toBe(docId);
        });

        it("should return zero chunk count on failure", async () => {
            mockActivityResults.extractTextError = new Error("Failed");

            const input = createProcessingInput("doc-zero-chunks", "kb-001", {
                filePath: "/uploads/fail.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.chunkCount).toBe(0);
        });

        it("should have success=false on any error", async () => {
            mockActivityResults.extractTextError = new Error("Any error");

            const input = createProcessingInput("doc-fail-flag", "kb-001", {
                filePath: "/uploads/fail.pdf",
                fileType: "pdf"
            });

            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
        });
    });
});
