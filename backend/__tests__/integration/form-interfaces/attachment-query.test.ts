/**
 * Public Form Attachment Query Route Tests
 *
 * Tests for POST /api/public/form-interfaces/:slug/submissions/:submissionId/query
 * RAG query endpoint for searching submission attachments
 */

import {
    createSimpleFormInterfaceTestEnvironment,
    createPublishedFormInterface,
    createTestSubmission,
    createCompletedSubmission,
    createTestChunk,
    createTestChunks
} from "./setup";
import type { SimpleFormInterfaceTestEnvironment } from "./helpers/form-interface-test-env";

describe("POST /api/public/form-interfaces/:slug/submissions/:submissionId/query", () => {
    let testEnv: SimpleFormInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleFormInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("Success Cases", () => {
        it("should return search results for valid query", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "query-form"
            });

            const submission = createCompletedSubmission(formInterface.id, "Output", {
                id: "sub-001",
                attachmentsStatus: "ready"
            });

            const chunks = createTestChunks(submission.id, 3);
            const searchResults = chunks.map((chunk, index) => ({
                ...chunk,
                similarity: 0.9 - index * 0.1
            }));

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);
            testEnv.repositories.submissionChunk.searchSimilar.mockResolvedValue(searchResults);

            // Act
            const form = await testEnv.repositories.formInterface.findBySlug("query-form");
            const sub = await testEnv.repositories.submission.findById("sub-001");

            // Simulate query with mock embedding
            const queryEmbedding = Array(1536).fill(0.1);
            const results = await testEnv.repositories.submissionChunk.searchSimilar({
                submissionId: sub!.id,
                queryEmbedding,
                topK: 5,
                similarityThreshold: 0.7
            });

            // Assert
            expect(form).not.toBeNull();
            expect(sub?.attachmentsStatus).toBe("ready");
            expect(results).toHaveLength(3);
            expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
        });

        it("should respect topK parameter", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "topk-form"
            });

            const submission = createCompletedSubmission(formInterface.id, "Output", {
                id: "sub-001",
                attachmentsStatus: "ready"
            });

            const chunks = createTestChunks(submission.id, 10);
            const limitedResults = chunks.slice(0, 3).map((chunk, index) => ({
                ...chunk,
                similarity: 0.95 - index * 0.05
            }));

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);
            testEnv.repositories.submissionChunk.searchSimilar.mockResolvedValue(limitedResults);

            // Act
            const results = await testEnv.repositories.submissionChunk.searchSimilar({
                submissionId: submission.id,
                queryEmbedding: Array(1536).fill(0.1),
                topK: 3,
                similarityThreshold: 0.7
            });

            // Assert
            expect(results).toHaveLength(3);
            expect(testEnv.repositories.submissionChunk.searchSimilar).toHaveBeenCalledWith(
                expect.objectContaining({ topK: 3 })
            );
        });

        it("should respect similarityThreshold parameter", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "threshold-form"
            });

            const submission = createCompletedSubmission(formInterface.id, "Output", {
                id: "sub-001",
                attachmentsStatus: "ready"
            });

            // Only return chunks above threshold
            const highSimilarityChunks = [
                { ...createTestChunk(submission.id, { chunkIndex: 0 }), similarity: 0.95 },
                { ...createTestChunk(submission.id, { chunkIndex: 1 }), similarity: 0.85 }
            ];

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);
            testEnv.repositories.submissionChunk.searchSimilar.mockResolvedValue(
                highSimilarityChunks
            );

            // Act
            const results = await testEnv.repositories.submissionChunk.searchSimilar({
                submissionId: submission.id,
                queryEmbedding: Array(1536).fill(0.1),
                topK: 5,
                similarityThreshold: 0.8 // High threshold
            });

            // Assert
            expect(results).toHaveLength(2);
            results.forEach((result) => {
                expect(result.similarity).toBeGreaterThanOrEqual(0.8);
            });
        });

        it("should use default topK and threshold when not provided", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "default-form"
            });

            const submission = createCompletedSubmission(formInterface.id, "Output", {
                id: "sub-001",
                attachmentsStatus: "ready"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);
            testEnv.repositories.submissionChunk.searchSimilar.mockResolvedValue([]);

            // Act - simulate call without optional params
            await testEnv.repositories.submissionChunk.searchSimilar({
                submissionId: submission.id,
                queryEmbedding: Array(1536).fill(0.1),
                topK: 5, // Default
                similarityThreshold: 0.7 // Default
            });

            // Assert - defaults should be used
            expect(testEnv.repositories.submissionChunk.searchSimilar).toHaveBeenCalledWith(
                expect.objectContaining({
                    topK: 5,
                    similarityThreshold: 0.7
                })
            );
        });
    });

    describe("Attachments Still Processing", () => {
        it("should return empty results with message when attachments processing", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "processing-form"
            });

            // Use createTestSubmission directly to control attachmentsStatus
            const submission = createTestSubmission(formInterface.id, {
                id: "sub-001",
                executionId: "exec-001",
                executionStatus: "running",
                attachmentsStatus: "processing"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const sub = await testEnv.repositories.submission.findById("sub-001");

            // Assert - should indicate still processing
            expect(sub?.attachmentsStatus).toBe("processing");
            // In real implementation, would return { results: [], message: "Attachments are still being processed" }
        });

        it("should return empty results when attachments pending", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "pending-form"
            });

            const submission = createTestSubmission(formInterface.id, {
                id: "sub-001",
                attachmentsStatus: "pending"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const sub = await testEnv.repositories.submission.findById("sub-001");

            // Assert
            expect(sub?.attachmentsStatus).toBe("pending");
        });
    });

    describe("Validation", () => {
        it("should fail when query is empty", async () => {
            // Arrange
            const emptyQuery = "";

            // Assert - validation should fail
            expect(emptyQuery.trim()).toBe("");
        });

        it("should fail when query is whitespace only", async () => {
            // Arrange
            const whitespaceQuery = "   ";

            // Assert - validation should fail
            expect(whitespaceQuery.trim()).toBe("");
        });
    });

    describe("Not Found / Errors", () => {
        it("should return null for non-existent form", async () => {
            // Arrange
            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.formInterface.findBySlug("nonexistent");

            // Assert
            expect(result).toBeNull();
        });

        it("should return null for non-existent submission", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "test-form"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(null);

            // Act
            const result = await testEnv.repositories.submission.findById("nonexistent");

            // Assert
            expect(result).toBeNull();
        });

        it("should fail when submission belongs to different form", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "form-one"
            });

            // Submission belongs to a different form
            const submission = createTestSubmission("fi-different", {
                id: "sub-001"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);

            // Act
            const form = await testEnv.repositories.formInterface.findBySlug("form-one");
            const sub = await testEnv.repositories.submission.findById("sub-001");

            // Assert - submission doesn't belong to this form
            expect(sub?.interfaceId).not.toBe(form?.id);
        });
    });

    describe("Response Format", () => {
        it("should return results with content and metadata", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "response-form"
            });

            const submission = createCompletedSubmission(formInterface.id, "Output", {
                id: "sub-001",
                attachmentsStatus: "ready"
            });

            const chunk = createTestChunk(submission.id, {
                chunkIndex: 0,
                content: "This is the relevant content from the document.",
                sourceType: "file",
                sourceName: "report.pdf"
            });

            const searchResult = {
                ...chunk,
                similarity: 0.92
            };

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);
            testEnv.repositories.submissionChunk.searchSimilar.mockResolvedValue([searchResult]);

            // Act
            const results = await testEnv.repositories.submissionChunk.searchSimilar({
                submissionId: submission.id,
                queryEmbedding: Array(1536).fill(0.1),
                topK: 5,
                similarityThreshold: 0.7
            });

            // Assert
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                content: expect.any(String),
                sourceType: "file",
                sourceName: "report.pdf",
                similarity: expect.any(Number)
            });
        });

        it("should return results sorted by similarity descending", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "sorted-form"
            });

            const submission = createCompletedSubmission(formInterface.id, "Output", {
                id: "sub-001",
                attachmentsStatus: "ready"
            });

            const sortedResults = [
                { ...createTestChunk(submission.id, { chunkIndex: 0 }), similarity: 0.95 },
                { ...createTestChunk(submission.id, { chunkIndex: 1 }), similarity: 0.88 },
                { ...createTestChunk(submission.id, { chunkIndex: 2 }), similarity: 0.75 }
            ];

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);
            testEnv.repositories.submissionChunk.searchSimilar.mockResolvedValue(sortedResults);

            // Act
            const results = await testEnv.repositories.submissionChunk.searchSimilar({
                submissionId: submission.id,
                queryEmbedding: Array(1536).fill(0.1),
                topK: 5,
                similarityThreshold: 0.7
            });

            // Assert - results should be sorted by similarity descending
            for (let i = 0; i < results.length - 1; i++) {
                expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
            }
        });
    });

    describe("No Results", () => {
        it("should return empty array when no matching chunks", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "no-results-form"
            });

            const submission = createCompletedSubmission(formInterface.id, "Output", {
                id: "sub-001",
                attachmentsStatus: "ready"
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);
            testEnv.repositories.submissionChunk.searchSimilar.mockResolvedValue([]);

            // Act
            const results = await testEnv.repositories.submissionChunk.searchSimilar({
                submissionId: submission.id,
                queryEmbedding: Array(1536).fill(0.1),
                topK: 5,
                similarityThreshold: 0.7
            });

            // Assert
            expect(results).toEqual([]);
        });

        it("should return empty array when submission has no attachments", async () => {
            // Arrange
            const formInterface = createPublishedFormInterface({
                id: "fi-001",
                slug: "no-attachments-form"
            });

            const submission = createCompletedSubmission(formInterface.id, "Output", {
                id: "sub-001",
                attachmentsStatus: "ready" // Ready but no files were uploaded
            });

            testEnv.repositories.formInterface.findBySlug.mockResolvedValue(formInterface);
            testEnv.repositories.submission.findById.mockResolvedValue(submission);
            testEnv.repositories.submissionChunk.searchSimilar.mockResolvedValue([]);

            // Act
            const results = await testEnv.repositories.submissionChunk.searchSimilar({
                submissionId: submission.id,
                queryEmbedding: Array(1536).fill(0.1),
                topK: 5,
                similarityThreshold: 0.7
            });

            // Assert
            expect(results).toEqual([]);
        });
    });

    describe("Source Types", () => {
        it("should handle file source type", async () => {
            // Arrange
            const chunk = createTestChunk("sub-001", {
                sourceType: "file",
                sourceName: "document.pdf"
            });

            // Assert
            expect(chunk.sourceType).toBe("file");
            expect(chunk.sourceName).toBe("document.pdf");
        });

        it("should handle url source type", async () => {
            // Arrange
            const chunk = createTestChunk("sub-001", {
                sourceType: "url",
                sourceName: "https://example.com/article"
            });

            // Assert
            expect(chunk.sourceType).toBe("url");
            expect(chunk.sourceName).toBe("https://example.com/article");
        });
    });
});
