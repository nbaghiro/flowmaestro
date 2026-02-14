/**
 * FormInterfaceSubmissionChunkRepository Tests
 *
 * Tests for submission chunk storage and vector similarity search
 * for RAG-based attachment querying.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { FormInterfaceSubmissionChunkRepository } from "../FormInterfaceSubmissionChunkRepository";
import { mockRows, mockAffectedRows, mockCountResult, generateId } from "./setup";

// Generate a mock embedding (1536 dimensions for OpenAI ada-002)
function generateMockEmbedding(dimensions: number = 1536): number[] {
    return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
}

// Generate a mock chunk row
function generateChunkRow(
    overrides: Partial<{
        id: string;
        submission_id: string;
        source_type: "file" | "url";
        source_name: string;
        source_index: number;
        content: string;
        chunk_index: number;
        metadata: Record<string, unknown> | string;
        created_at: string;
    }> = {}
) {
    const now = new Date().toISOString();
    return {
        id: generateId(),
        submission_id: generateId(),
        source_type: "file" as const,
        source_name: "document.pdf",
        source_index: 0,
        content: "This is sample chunk content for testing.",
        chunk_index: 0,
        metadata: "{}",
        created_at: now,
        ...overrides
    };
}

describe("FormInterfaceSubmissionChunkRepository", () => {
    let repository: FormInterfaceSubmissionChunkRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new FormInterfaceSubmissionChunkRepository();
    });

    describe("createChunks", () => {
        it("should batch insert multiple chunks", async () => {
            const submissionId = generateId();
            const embedding = generateMockEmbedding();
            const chunks = [
                {
                    submissionId,
                    sourceType: "file" as const,
                    sourceName: "doc.pdf",
                    sourceIndex: 0,
                    content: "First chunk content",
                    chunkIndex: 0,
                    embedding,
                    metadata: { page: 1 }
                },
                {
                    submissionId,
                    sourceType: "file" as const,
                    sourceName: "doc.pdf",
                    sourceIndex: 0,
                    content: "Second chunk content",
                    chunkIndex: 1,
                    embedding,
                    metadata: { page: 1 }
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 2,
                command: "INSERT",
                oid: 0,
                fields: []
            });

            await repository.createChunks(chunks);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.form_interface_submission_chunks"),
                expect.any(Array)
            );
            // Should have 8 values per chunk (submissionId, sourceType, sourceName, sourceIndex, content, chunkIndex, embedding, metadata)
            const callArgs = mockQuery.mock.calls[0][1];
            expect(callArgs.length).toBe(16); // 8 * 2 chunks
        });

        it("should do nothing when chunks array is empty", async () => {
            await repository.createChunks([]);

            expect(mockQuery).not.toHaveBeenCalled();
        });

        it("should format embedding as vector string", async () => {
            const submissionId = generateId();
            const embedding = [0.1, 0.2, 0.3];
            const chunks = [
                {
                    submissionId,
                    sourceType: "file" as const,
                    sourceName: "doc.pdf",
                    sourceIndex: 0,
                    content: "Content",
                    chunkIndex: 0,
                    embedding
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 1,
                command: "INSERT",
                oid: 0,
                fields: []
            });

            await repository.createChunks(chunks);

            const callArgs = mockQuery.mock.calls[0][1];
            expect(callArgs).toContain("[0.1,0.2,0.3]");
        });

        it("should stringify metadata as JSON", async () => {
            const submissionId = generateId();
            const metadata = { page: 5, section: "intro" };
            const chunks = [
                {
                    submissionId,
                    sourceType: "file" as const,
                    sourceName: "doc.pdf",
                    sourceIndex: 0,
                    content: "Content",
                    chunkIndex: 0,
                    embedding: [0.1],
                    metadata
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 1,
                command: "INSERT",
                oid: 0,
                fields: []
            });

            await repository.createChunks(chunks);

            const callArgs = mockQuery.mock.calls[0][1];
            expect(callArgs).toContain(JSON.stringify(metadata));
        });

        it("should handle URL source type", async () => {
            const chunks = [
                {
                    submissionId: generateId(),
                    sourceType: "url" as const,
                    sourceName: "https://example.com/page",
                    sourceIndex: 0,
                    content: "Web page content",
                    chunkIndex: 0,
                    embedding: [0.1]
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 1,
                command: "INSERT",
                oid: 0,
                fields: []
            });

            await repository.createChunks(chunks);

            const callArgs = mockQuery.mock.calls[0][1];
            expect(callArgs).toContain("url");
            expect(callArgs).toContain("https://example.com/page");
        });
    });

    describe("searchSimilar", () => {
        it("should search for similar chunks using vector similarity", async () => {
            const submissionId = generateId();
            const queryEmbedding = generateMockEmbedding();
            const mockResults = [
                {
                    id: generateId(),
                    content: "Matching content",
                    source_name: "doc.pdf",
                    source_type: "file",
                    similarity: 0.95,
                    metadata: "{}"
                },
                {
                    id: generateId(),
                    content: "Another match",
                    source_name: "doc.pdf",
                    source_type: "file",
                    similarity: 0.85,
                    metadata: "{}"
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockResults));

            const result = await repository.searchSimilar({
                submissionId,
                queryEmbedding
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("1 - (embedding <=> $2::vector)"),
                expect.arrayContaining([submissionId])
            );
            expect(result).toHaveLength(2);
            expect(result[0].similarity).toBe(0.95);
        });

        it("should use default topK of 5", async () => {
            const submissionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                submissionId,
                queryEmbedding: [0.1, 0.2]
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LIMIT $4"),
                expect.arrayContaining([5])
            );
        });

        it("should use default similarity threshold of 0.7", async () => {
            const submissionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                submissionId,
                queryEmbedding: [0.1, 0.2]
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([0.7])
            );
        });

        it("should allow custom topK and threshold", async () => {
            const submissionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                submissionId,
                queryEmbedding: [0.1, 0.2],
                topK: 10,
                similarityThreshold: 0.8
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([0.8, 10])
            );
        });

        it("should parse metadata JSON string", async () => {
            const submissionId = generateId();
            const metadata = { page: 3, section: "conclusion" };
            const mockResults = [
                {
                    id: generateId(),
                    content: "Content",
                    source_name: "doc.pdf",
                    source_type: "file",
                    similarity: 0.9,
                    metadata: JSON.stringify(metadata)
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockResults));

            const result = await repository.searchSimilar({
                submissionId,
                queryEmbedding: [0.1]
            });

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should handle metadata as object directly", async () => {
            const submissionId = generateId();
            const metadata = { page: 3 };
            const mockResults = [
                {
                    id: generateId(),
                    content: "Content",
                    source_name: "doc.pdf",
                    source_type: "file",
                    similarity: 0.9,
                    metadata
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockResults));

            const result = await repository.searchSimilar({
                submissionId,
                queryEmbedding: [0.1]
            });

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should return empty array when no matches", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([]));

            const result = await repository.searchSimilar({
                submissionId: generateId(),
                queryEmbedding: [0.1]
            });

            expect(result).toEqual([]);
        });

        it("should order results by similarity DESC", async () => {
            const submissionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                submissionId,
                queryEmbedding: [0.1]
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY similarity DESC"),
                expect.anything()
            );
        });
    });

    describe("findBySubmissionId", () => {
        it("should return all chunks for submission", async () => {
            const submissionId = generateId();
            const mockChunks = [
                generateChunkRow({ submission_id: submissionId, chunk_index: 0 }),
                generateChunkRow({ submission_id: submissionId, chunk_index: 1 })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockChunks));

            const result = await repository.findBySubmissionId(submissionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE submission_id = $1"),
                [submissionId]
            );
            expect(result).toHaveLength(2);
        });

        it("should order by source_index then chunk_index", async () => {
            const submissionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findBySubmissionId(submissionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY source_index, chunk_index"),
                expect.anything()
            );
        });

        it("should return empty array when no chunks", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([]));

            const result = await repository.findBySubmissionId(generateId());

            expect(result).toEqual([]);
        });
    });

    describe("countBySubmissionId", () => {
        it("should return count of chunks", async () => {
            const submissionId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(25));

            const result = await repository.countBySubmissionId(submissionId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT COUNT(*)"), [
                submissionId
            ]);
            expect(result).toBe(25);
        });

        it("should return 0 when no chunks", async () => {
            mockQuery.mockResolvedValueOnce(mockCountResult(0));

            const result = await repository.countBySubmissionId(generateId());

            expect(result).toBe(0);
        });
    });

    describe("deleteBySubmissionId", () => {
        it("should delete all chunks for submission", async () => {
            const submissionId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(10));

            await repository.deleteBySubmissionId(submissionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.form_interface_submission_chunks"),
                [submissionId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE submission_id = $1"),
                [submissionId]
            );
        });

        it("should handle deletion when no chunks exist", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            // Should not throw
            await expect(repository.deleteBySubmissionId(generateId())).resolves.not.toThrow();
        });
    });

    describe("row mapping", () => {
        it("should correctly map chunk fields", async () => {
            const submissionId = generateId();
            const now = new Date().toISOString();
            const mockChunk = generateChunkRow({
                submission_id: submissionId,
                source_type: "url",
                source_name: "https://example.com",
                source_index: 2,
                content: "URL content",
                chunk_index: 5,
                created_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySubmissionId(submissionId);

            expect(result[0].submissionId).toBe(submissionId);
            expect(result[0].sourceType).toBe("url");
            expect(result[0].sourceName).toBe("https://example.com");
            expect(result[0].sourceIndex).toBe(2);
            expect(result[0].chunkIndex).toBe(5);
            expect(result[0].createdAt).toBeInstanceOf(Date);
        });

        it("should parse metadata JSON string", async () => {
            const submissionId = generateId();
            const metadata = { page: 10, heading: "Introduction" };
            const mockChunk = generateChunkRow({
                submission_id: submissionId,
                metadata: JSON.stringify(metadata)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySubmissionId(submissionId);

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should handle metadata as object directly", async () => {
            const submissionId = generateId();
            const metadata = { page: 10 };
            const mockChunk = generateChunkRow({ submission_id: submissionId });
            (mockChunk as Record<string, unknown>).metadata = metadata;

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySubmissionId(submissionId);

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should handle empty metadata", async () => {
            const submissionId = generateId();
            const mockChunk = generateChunkRow({
                submission_id: submissionId,
                metadata: "{}"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySubmissionId(submissionId);

            expect(result[0].metadata).toEqual({});
        });
    });
});
