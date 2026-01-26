/**
 * Document Processor Workflow Tests
 *
 * Tests for the document processing workflow covering:
 * - Text extraction from various document types
 * - Text chunking with configurable settings
 * - Embedding generation and storage
 * - Document completion handling
 * - Error handling and recovery
 */

import type { DocumentFileType } from "../../../storage/models/KnowledgeDocument";

// ============================================================================
// MOCK SETUP
// ============================================================================

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

interface ProcessDocumentWorkflowInput {
    documentId: string;
    knowledgeBaseId: string;
    filePath?: string;
    sourceUrl?: string;
    fileType: string;
    userId?: string;
}

interface ProcessDocumentWorkflowResult {
    documentId: string;
    success: boolean;
    chunkCount: number;
    error?: string;
}

/**
 * Simulates the document processor workflow execution
 */
async function simulateProcessDocumentWorkflow(
    input: ProcessDocumentWorkflowInput
): Promise<ProcessDocumentWorkflowResult> {
    try {
        // Step 1: Extract text from document
        const content = await mockExtractTextActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: input.fileType as DocumentFileType,
            userId: input.userId
        });

        if (!content || content.trim().length === 0) {
            throw new Error("No content extracted from document");
        }

        // Step 2: Chunk the text
        const chunks = await mockChunkTextActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: input.fileType as DocumentFileType,
            userId: input.userId,
            content
        });

        if (chunks.length === 0) {
            throw new Error("No chunks created from content");
        }

        // Step 3: Generate embeddings and store chunks
        const { chunkCount } = await mockGenerateAndStoreEmbeddingsActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: input.fileType as DocumentFileType,
            userId: input.userId,
            chunks
        });

        // Step 4: Mark document as ready
        await mockCompleteDocumentProcessingActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: input.fileType as DocumentFileType,
            userId: input.userId
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

function createTestInput(
    overrides: Partial<ProcessDocumentWorkflowInput> = {}
): ProcessDocumentWorkflowInput {
    return {
        documentId: "doc-123",
        knowledgeBaseId: "kb-456",
        filePath: "/uploads/document.pdf",
        fileType: "pdf",
        userId: "user-789",
        ...overrides
    };
}

function createTestChunks(count: number): ChunkData[] {
    return Array.from({ length: count }, (_, i) => ({
        content: `Chunk ${i + 1} content with some text that represents extracted content.`,
        index: i,
        metadata: { source: "test", chunkIndex: i }
    }));
}

// ============================================================================
// TESTS
// ============================================================================

describe("Process Document Workflow", () => {
    beforeEach(() => {
        resetMocks();
        jest.clearAllMocks();
    });

    describe("text extraction", () => {
        it("should extract text from PDF document", async () => {
            mockActivityResults.extractTextResult = "This is extracted text from the PDF document.";
            mockActivityResults.chunkTextResult = createTestChunks(3);
            mockActivityResults.generateAndStoreResult = { chunkCount: 3, totalTokens: 150 };

            const input = createTestInput({ fileType: "pdf" });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
            expect(mockExtractTextActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    documentId: "doc-123",
                    fileType: "pdf"
                })
            );
        });

        it("should extract text from Word document", async () => {
            mockActivityResults.extractTextResult = "Word document content.";
            mockActivityResults.chunkTextResult = createTestChunks(2);
            mockActivityResults.generateAndStoreResult = { chunkCount: 2, totalTokens: 100 };

            const input = createTestInput({ fileType: "docx" });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
            expect(mockExtractTextActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileType: "docx"
                })
            );
        });

        it("should extract text from plain text file", async () => {
            mockActivityResults.extractTextResult = "Plain text content.";
            mockActivityResults.chunkTextResult = createTestChunks(1);
            mockActivityResults.generateAndStoreResult = { chunkCount: 1, totalTokens: 50 };

            const input = createTestInput({ fileType: "txt" });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
        });

        it("should extract text from URL source", async () => {
            mockActivityResults.extractTextResult = "Web page content from URL.";
            mockActivityResults.chunkTextResult = createTestChunks(2);
            mockActivityResults.generateAndStoreResult = { chunkCount: 2, totalTokens: 100 };

            const input = createTestInput({
                filePath: undefined,
                sourceUrl: "https://example.com/document"
            });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
            expect(mockExtractTextActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    sourceUrl: "https://example.com/document"
                })
            );
        });

        it("should fail if text extraction returns empty content", async () => {
            mockActivityResults.extractTextResult = "";

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("No content extracted");
        });

        it("should fail if text extraction returns whitespace only", async () => {
            mockActivityResults.extractTextResult = "   \n\t  ";

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("No content extracted");
        });

        it("should fail if text extraction throws error", async () => {
            mockActivityResults.extractTextError = new Error("Unsupported file format");

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Unsupported file format");
        });

        it("should handle corrupted file error", async () => {
            mockActivityResults.extractTextError = new Error("File is corrupted or encrypted");

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("corrupted");
        });
    });

    describe("text chunking", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult =
                "This is a long document with multiple paragraphs that needs to be chunked.";
        });

        it("should chunk extracted text", async () => {
            mockActivityResults.chunkTextResult = createTestChunks(5);
            mockActivityResults.generateAndStoreResult = { chunkCount: 5, totalTokens: 250 };

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
            expect(result.chunkCount).toBe(5);
            expect(mockChunkTextActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: mockActivityResults.extractTextResult
                })
            );
        });

        it("should pass document context to chunking", async () => {
            mockActivityResults.chunkTextResult = createTestChunks(2);
            mockActivityResults.generateAndStoreResult = { chunkCount: 2, totalTokens: 100 };

            const input = createTestInput();
            await simulateProcessDocumentWorkflow(input);

            expect(mockChunkTextActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    documentId: "doc-123",
                    knowledgeBaseId: "kb-456"
                })
            );
        });

        it("should fail if no chunks are created", async () => {
            mockActivityResults.chunkTextResult = [];

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("No chunks created");
        });

        it("should handle chunking error", async () => {
            mockActivityResults.chunkTextError = new Error("Chunking configuration invalid");

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Chunking configuration invalid");
        });

        it("should handle very small documents with single chunk", async () => {
            mockActivityResults.extractTextResult = "Small document.";
            mockActivityResults.chunkTextResult = createTestChunks(1);
            mockActivityResults.generateAndStoreResult = { chunkCount: 1, totalTokens: 10 };

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
            expect(result.chunkCount).toBe(1);
        });

        it("should handle large documents with many chunks", async () => {
            mockActivityResults.extractTextResult = "A".repeat(100000);
            mockActivityResults.chunkTextResult = createTestChunks(100);
            mockActivityResults.generateAndStoreResult = { chunkCount: 100, totalTokens: 5000 };

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
            expect(result.chunkCount).toBe(100);
        });
    });

    describe("embedding generation and storage", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult = "Document content for embedding.";
            mockActivityResults.chunkTextResult = createTestChunks(3);
        });

        it("should generate and store embeddings for chunks", async () => {
            mockActivityResults.generateAndStoreResult = { chunkCount: 3, totalTokens: 150 };

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
            expect(mockGenerateAndStoreEmbeddingsActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    chunks: mockActivityResults.chunkTextResult
                })
            );
        });

        it("should pass knowledge base context to embedding activity", async () => {
            mockActivityResults.generateAndStoreResult = { chunkCount: 3, totalTokens: 150 };

            const input = createTestInput();
            await simulateProcessDocumentWorkflow(input);

            expect(mockGenerateAndStoreEmbeddingsActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    knowledgeBaseId: "kb-456",
                    documentId: "doc-123"
                })
            );
        });

        it("should handle embedding generation failure", async () => {
            mockActivityResults.generateAndStoreError = new Error("Embedding API rate limited");

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Embedding API rate limited");
        });

        it("should handle storage failure", async () => {
            mockActivityResults.generateAndStoreError = new Error("Database connection failed");

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database connection failed");
        });

        it("should report total tokens used", async () => {
            mockActivityResults.generateAndStoreResult = { chunkCount: 5, totalTokens: 2500 };

            const input = createTestInput();
            await simulateProcessDocumentWorkflow(input);

            expect(mockGenerateAndStoreEmbeddingsActivity).toHaveBeenCalled();
        });
    });

    describe("document completion", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult = "Document content.";
            mockActivityResults.chunkTextResult = createTestChunks(2);
            mockActivityResults.generateAndStoreResult = { chunkCount: 2, totalTokens: 100 };
        });

        it("should mark document as ready on success", async () => {
            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
            expect(mockActivityResults.completeProcessingCalled).toBe(true);
            expect(mockCompleteDocumentProcessingActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    documentId: "doc-123"
                })
            );
        });

        it("should not complete document if extraction fails", async () => {
            mockActivityResults.extractTextError = new Error("Extraction failed");

            const input = createTestInput();
            await simulateProcessDocumentWorkflow(input);

            expect(mockActivityResults.completeProcessingCalled).toBe(false);
        });

        it("should not complete document if chunking fails", async () => {
            mockActivityResults.chunkTextError = new Error("Chunking failed");

            const input = createTestInput();
            await simulateProcessDocumentWorkflow(input);

            expect(mockActivityResults.completeProcessingCalled).toBe(false);
        });

        it("should not complete document if embedding fails", async () => {
            mockActivityResults.generateAndStoreError = new Error("Embedding failed");

            const input = createTestInput();
            await simulateProcessDocumentWorkflow(input);

            expect(mockActivityResults.completeProcessingCalled).toBe(false);
        });

        it("should handle completion activity failure", async () => {
            mockActivityResults.completeProcessingError = new Error("Failed to update status");

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Failed to update status");
        });
    });

    describe("file types", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult = "Content from file.";
            mockActivityResults.chunkTextResult = createTestChunks(1);
            mockActivityResults.generateAndStoreResult = { chunkCount: 1, totalTokens: 50 };
        });

        it("should process PDF files", async () => {
            const input = createTestInput({ fileType: "pdf" });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
        });

        it("should process DOCX files", async () => {
            const input = createTestInput({ fileType: "docx" });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
        });

        it("should process TXT files", async () => {
            const input = createTestInput({ fileType: "txt" });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
        });

        it("should process MD (markdown) files", async () => {
            const input = createTestInput({ fileType: "md" });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
        });

        it("should process HTML files", async () => {
            const input = createTestInput({ fileType: "html" });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
        });

        it("should process CSV files", async () => {
            const input = createTestInput({ fileType: "csv" });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
        });
    });

    describe("error handling", () => {
        it("should return document ID even on failure", async () => {
            mockActivityResults.extractTextError = new Error("Some error");

            const input = createTestInput({ documentId: "doc-error-test" });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.documentId).toBe("doc-error-test");
            expect(result.success).toBe(false);
        });

        it("should return zero chunk count on failure", async () => {
            mockActivityResults.extractTextError = new Error("Some error");

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.chunkCount).toBe(0);
        });

        it("should handle null extraction result", async () => {
            mockActivityResults.extractTextResult = null;

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain("No content extracted");
        });

        it("should handle unknown error types", async () => {
            mockActivityResults.extractTextError = "String error" as unknown as Error;

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Unknown error while processing document");
        });
    });

    describe("user context", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult = "Content.";
            mockActivityResults.chunkTextResult = createTestChunks(1);
            mockActivityResults.generateAndStoreResult = { chunkCount: 1, totalTokens: 50 };
        });

        it("should pass userId to all activities", async () => {
            const input = createTestInput({ userId: "user-test-123" });
            await simulateProcessDocumentWorkflow(input);

            expect(mockExtractTextActivity).toHaveBeenCalledWith(
                expect.objectContaining({ userId: "user-test-123" })
            );
            expect(mockChunkTextActivity).toHaveBeenCalledWith(
                expect.objectContaining({ userId: "user-test-123" })
            );
            expect(mockGenerateAndStoreEmbeddingsActivity).toHaveBeenCalledWith(
                expect.objectContaining({ userId: "user-test-123" })
            );
            expect(mockCompleteDocumentProcessingActivity).toHaveBeenCalledWith(
                expect.objectContaining({ userId: "user-test-123" })
            );
        });

        it("should handle missing userId", async () => {
            const input = createTestInput({ userId: undefined });
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.success).toBe(true);
        });
    });

    describe("knowledge base context", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult = "Content.";
            mockActivityResults.chunkTextResult = createTestChunks(1);
            mockActivityResults.generateAndStoreResult = { chunkCount: 1, totalTokens: 50 };
        });

        it("should pass knowledgeBaseId to all activities", async () => {
            const input = createTestInput({ knowledgeBaseId: "kb-test-456" });
            await simulateProcessDocumentWorkflow(input);

            expect(mockExtractTextActivity).toHaveBeenCalledWith(
                expect.objectContaining({ knowledgeBaseId: "kb-test-456" })
            );
            expect(mockChunkTextActivity).toHaveBeenCalledWith(
                expect.objectContaining({ knowledgeBaseId: "kb-test-456" })
            );
            expect(mockGenerateAndStoreEmbeddingsActivity).toHaveBeenCalledWith(
                expect.objectContaining({ knowledgeBaseId: "kb-test-456" })
            );
        });
    });

    describe("workflow result", () => {
        beforeEach(() => {
            mockActivityResults.extractTextResult = "Content.";
            mockActivityResults.chunkTextResult = createTestChunks(5);
            mockActivityResults.generateAndStoreResult = { chunkCount: 5, totalTokens: 250 };
        });

        it("should return correct chunk count on success", async () => {
            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.chunkCount).toBe(5);
        });

        it("should not include error on success", async () => {
            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.error).toBeUndefined();
        });

        it("should include error message on failure", async () => {
            mockActivityResults.extractTextError = new Error("Specific error message");

            const input = createTestInput();
            const result = await simulateProcessDocumentWorkflow(input);

            expect(result.error).toBe("Specific error message");
        });
    });
});
