/**
 * KnowledgeChunkRepository Tests
 *
 * Tests for knowledge chunk operations including creation,
 * batch insert, vector similarity search, and embedding updates.
 */

// Mock the logging module
jest.mock("../../../core/logging", () => ({
    createServiceLogger: () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));

// Mock pgvector
jest.mock("pgvector", () => ({
    toSql: (arr: number[]) => JSON.stringify(arr)
}));

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { KnowledgeChunkRepository } from "../KnowledgeChunkRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateKnowledgeChunkRow,
    generateId
} from "./setup";

describe("KnowledgeChunkRepository", () => {
    let repository: KnowledgeChunkRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new KnowledgeChunkRepository();
    });

    describe("create", () => {
        it("should insert a new knowledge chunk with embedding", async () => {
            const input = {
                document_id: generateId(),
                knowledge_base_id: generateId(),
                chunk_index: 0,
                content: "This is test content for the knowledge base.",
                embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
                token_count: 10,
                metadata: { source: "test" }
            };

            const mockRow = generateKnowledgeChunkRow({
                document_id: input.document_id,
                knowledge_base_id: input.knowledge_base_id,
                chunk_index: input.chunk_index,
                content: input.content,
                token_count: input.token_count,
                metadata: JSON.stringify(input.metadata)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.knowledge_chunks"),
                expect.arrayContaining([
                    input.document_id,
                    input.knowledge_base_id,
                    input.chunk_index,
                    input.content,
                    JSON.stringify(input.embedding),
                    input.token_count,
                    JSON.stringify(input.metadata)
                ])
            );
            expect(result.document_id).toBe(input.document_id);
            expect(result.chunk_index).toBe(0);
        });

        it("should handle null embedding", async () => {
            const input = {
                document_id: generateId(),
                knowledge_base_id: generateId(),
                chunk_index: 0,
                content: "Content without embedding"
            };

            const mockRow = generateKnowledgeChunkRow({
                document_id: input.document_id,
                embedding: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([null]) // embedding should be null
            );
        });
    });

    describe("batchInsert", () => {
        it("should insert multiple chunks in one query", async () => {
            const knowledgeBaseId = generateId();
            const documentId = generateId();
            const inputs = [
                {
                    document_id: documentId,
                    knowledge_base_id: knowledgeBaseId,
                    chunk_index: 0,
                    content: "Chunk 1 content",
                    embedding: [0.1, 0.2],
                    token_count: 5
                },
                {
                    document_id: documentId,
                    knowledge_base_id: knowledgeBaseId,
                    chunk_index: 1,
                    content: "Chunk 2 content",
                    embedding: [0.3, 0.4],
                    token_count: 5
                }
            ];

            const mockRows = inputs.map((input, idx) =>
                generateKnowledgeChunkRow({
                    document_id: input.document_id,
                    knowledge_base_id: input.knowledge_base_id,
                    chunk_index: idx,
                    content: input.content
                })
            );

            mockQuery.mockResolvedValueOnce(mockInsertReturning(mockRows));

            const result = await repository.batchInsert(inputs);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("VALUES"),
                expect.any(Array)
            );
            expect(result).toHaveLength(2);
        });

        it("should return empty array when no inputs", async () => {
            const result = await repository.batchInsert([]);

            expect(result).toEqual([]);
            expect(mockQuery).not.toHaveBeenCalled();
        });
    });

    describe("findById", () => {
        it("should return chunk when found", async () => {
            const chunkId = generateId();
            const mockRow = generateKnowledgeChunkRow({ id: chunkId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(chunkId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                chunkId
            ]);
            expect(result?.id).toBe(chunkId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByDocumentId", () => {
        it("should return chunks ordered by index", async () => {
            const documentId = generateId();
            const mockChunks = [
                generateKnowledgeChunkRow({ document_id: documentId, chunk_index: 0 }),
                generateKnowledgeChunkRow({ document_id: documentId, chunk_index: 1 }),
                generateKnowledgeChunkRow({ document_id: documentId, chunk_index: 2 })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockChunks));

            const result = await repository.findByDocumentId(documentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE document_id = $1"),
                [documentId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY chunk_index ASC"),
                expect.anything()
            );
            expect(result).toHaveLength(3);
        });
    });

    describe("searchSimilar", () => {
        it("should search for similar chunks using vector similarity", async () => {
            const knowledgeBaseId = generateId();
            const queryEmbedding = [0.1, 0.2, 0.3];
            const mockResults = [
                {
                    id: generateId(),
                    document_id: generateId(),
                    document_name: "Test Document",
                    chunk_index: 0,
                    content: "Similar content",
                    metadata: "{}",
                    similarity: "0.95"
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockResults));

            const result = await repository.searchSimilar({
                knowledge_base_id: knowledgeBaseId,
                query_embedding: queryEmbedding,
                top_k: 5,
                similarity_threshold: 0.7
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("1 - (kc.embedding <=>"),
                expect.arrayContaining([knowledgeBaseId])
            );
            expect(result).toHaveLength(1);
            expect(result[0].similarity).toBe(0.95);
        });

        it("should use default similarity threshold of 0.0", async () => {
            const knowledgeBaseId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                knowledge_base_id: knowledgeBaseId,
                query_embedding: [0.1, 0.2],
                top_k: 10
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([0.0]) // default threshold
            );
        });
    });

    describe("deleteByDocumentId", () => {
        it("should delete all chunks for document", async () => {
            const documentId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(5));

            const result = await repository.deleteByDocumentId(documentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.knowledge_chunks"),
                [documentId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE document_id = $1"),
                expect.anything()
            );
            expect(result).toBe(5);
        });
    });

    describe("deleteByKnowledgeBaseId", () => {
        it("should delete all chunks for knowledge base", async () => {
            const knowledgeBaseId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(100));

            const result = await repository.deleteByKnowledgeBaseId(knowledgeBaseId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.knowledge_chunks"),
                [knowledgeBaseId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE knowledge_base_id = $1"),
                expect.anything()
            );
            expect(result).toBe(100);
        });
    });

    describe("updateEmbedding", () => {
        it("should update chunk embedding", async () => {
            const chunkId = generateId();
            const newEmbedding = [0.5, 0.6, 0.7];
            const mockRow = generateKnowledgeChunkRow({ id: chunkId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateEmbedding(chunkId, newEmbedding);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SET embedding = $1"), [
                JSON.stringify(newEmbedding),
                chunkId
            ]);
            expect(result?.id).toBe(chunkId);
        });

        it("should return null when chunk not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.updateEmbedding("non-existent", [0.1, 0.2]);

            expect(result).toBeNull();
        });
    });

    describe("countByKnowledgeBaseId", () => {
        it("should return count of chunks", async () => {
            const knowledgeBaseId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(42));

            const result = await repository.countByKnowledgeBaseId(knowledgeBaseId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE knowledge_base_id = $1"),
                [knowledgeBaseId]
            );
            expect(result).toBe(42);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const chunkId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateKnowledgeChunkRow({
                id: chunkId,
                created_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(chunkId);

            expect(result?.created_at).toBeInstanceOf(Date);
        });

        it("should parse metadata from JSON string", async () => {
            const chunkId = generateId();
            const metadata = { source: "pdf", page: 5 };
            const mockRow = generateKnowledgeChunkRow({
                id: chunkId,
                metadata: JSON.stringify(metadata)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(chunkId);

            expect(result?.metadata).toEqual(metadata);
        });

        it("should parse vector string to array", async () => {
            const chunkId = generateId();
            const mockRow = generateKnowledgeChunkRow({
                id: chunkId,
                embedding: "[0.1,0.2,0.3]"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(chunkId);

            expect(result?.embedding).toEqual([0.1, 0.2, 0.3]);
        });

        it("should handle array embedding already parsed", async () => {
            const chunkId = generateId();
            const embedding = [0.1, 0.2, 0.3];
            const mockRow = {
                ...generateKnowledgeChunkRow({ id: chunkId }),
                embedding
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(chunkId);

            expect(result?.embedding).toEqual(embedding);
        });

        it("should handle null embedding", async () => {
            const chunkId = generateId();
            const mockRow = generateKnowledgeChunkRow({
                id: chunkId,
                embedding: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(chunkId);

            expect(result?.embedding).toBeNull();
        });
    });
});
