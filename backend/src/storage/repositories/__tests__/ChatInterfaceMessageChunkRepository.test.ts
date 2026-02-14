/**
 * ChatInterfaceMessageChunkRepository Tests
 *
 * Tests for message chunk storage and vector similarity search
 * for RAG-based attachment querying in chat interfaces.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { ChatInterfaceMessageChunkRepository } from "../ChatInterfaceMessageChunkRepository";
import {
    mockRows,
    mockAffectedRows,
    mockCountResult,
    mockInsertReturning,
    generateId
} from "./setup";

// Generate a mock embedding (1536 dimensions for OpenAI ada-002)
function generateMockEmbedding(dimensions: number = 1536): number[] {
    return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
}

// Generate a mock chunk row
function generateChunkRow(
    overrides: Partial<{
        id: string;
        session_id: string;
        thread_id: string | null;
        source_type: "file" | "url";
        source_name: string | null;
        source_index: number | null;
        content: string;
        chunk_index: number;
        embedding: string | null;
        metadata: Record<string, unknown> | string;
        created_at: string;
    }> = {}
) {
    const now = new Date().toISOString();
    return {
        id: generateId(),
        session_id: generateId(),
        thread_id: overrides.thread_id ?? null,
        source_type: "file" as const,
        source_name: "document.pdf",
        source_index: 0,
        content: "This is sample chunk content for testing.",
        chunk_index: 0,
        embedding: null,
        metadata: "{}",
        created_at: now,
        ...overrides
    };
}

describe("ChatInterfaceMessageChunkRepository", () => {
    let repository: ChatInterfaceMessageChunkRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ChatInterfaceMessageChunkRepository();
    });

    describe("createChunks", () => {
        it("should batch insert multiple chunks", async () => {
            const sessionId = generateId();
            const embedding = generateMockEmbedding();
            const chunks = [
                {
                    sessionId,
                    sourceType: "file" as const,
                    sourceName: "doc.pdf",
                    sourceIndex: 0,
                    content: "First chunk content",
                    chunkIndex: 0,
                    embedding,
                    metadata: { page: 1 }
                },
                {
                    sessionId,
                    sourceType: "file" as const,
                    sourceName: "doc.pdf",
                    sourceIndex: 0,
                    content: "Second chunk content",
                    chunkIndex: 1,
                    embedding,
                    metadata: { page: 1 }
                }
            ];

            const mockChunks = chunks.map((c) =>
                generateChunkRow({
                    session_id: c.sessionId,
                    source_type: c.sourceType,
                    source_name: c.sourceName,
                    source_index: c.sourceIndex,
                    content: c.content,
                    chunk_index: c.chunkIndex
                })
            );
            mockQuery.mockResolvedValueOnce(mockInsertReturning(mockChunks));

            const result = await repository.createChunks(chunks);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.chat_interface_message_chunks"),
                expect.any(Array)
            );
            // Should have 9 values per chunk
            const callArgs = mockQuery.mock.calls[0][1];
            expect(callArgs.length).toBe(18); // 9 * 2 chunks
            expect(result).toHaveLength(2);
        });

        it("should return empty array when chunks array is empty", async () => {
            const result = await repository.createChunks([]);

            expect(mockQuery).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it("should include threadId in insert", async () => {
            const sessionId = generateId();
            const threadId = generateId();
            const chunks = [
                {
                    sessionId,
                    threadId,
                    sourceType: "file" as const,
                    sourceName: "doc.pdf",
                    sourceIndex: 0,
                    content: "Content",
                    chunkIndex: 0
                }
            ];

            mockQuery.mockResolvedValueOnce(
                mockInsertReturning([
                    generateChunkRow({ session_id: sessionId, thread_id: threadId })
                ])
            );

            await repository.createChunks(chunks);

            const callArgs = mockQuery.mock.calls[0][1];
            expect(callArgs).toContain(threadId);
        });

        it("should stringify metadata as JSON", async () => {
            const sessionId = generateId();
            const metadata = { page: 5, section: "intro" };
            const chunks = [
                {
                    sessionId,
                    sourceType: "file" as const,
                    sourceName: "doc.pdf",
                    sourceIndex: 0,
                    content: "Content",
                    chunkIndex: 0,
                    embedding: [0.1],
                    metadata
                }
            ];

            mockQuery.mockResolvedValueOnce(
                mockInsertReturning([
                    generateChunkRow({ session_id: sessionId, metadata: JSON.stringify(metadata) })
                ])
            );

            await repository.createChunks(chunks);

            const callArgs = mockQuery.mock.calls[0][1];
            expect(callArgs).toContain(JSON.stringify(metadata));
        });

        it("should handle URL source type", async () => {
            const chunks = [
                {
                    sessionId: generateId(),
                    sourceType: "url" as const,
                    sourceName: "https://example.com/page",
                    sourceIndex: 0,
                    content: "Web page content",
                    chunkIndex: 0,
                    embedding: [0.1]
                }
            ];

            mockQuery.mockResolvedValueOnce(
                mockInsertReturning([
                    generateChunkRow({
                        source_type: "url",
                        source_name: "https://example.com/page"
                    })
                ])
            );

            await repository.createChunks(chunks);

            const callArgs = mockQuery.mock.calls[0][1];
            expect(callArgs).toContain("url");
            expect(callArgs).toContain("https://example.com/page");
        });

        it("should handle null optional fields", async () => {
            const chunks = [
                {
                    sessionId: generateId(),
                    sourceType: "file" as const,
                    content: "Content without optional fields",
                    chunkIndex: 0
                }
            ];

            mockQuery.mockResolvedValueOnce(
                mockInsertReturning([generateChunkRow({ source_name: null, source_index: null })])
            );

            await repository.createChunks(chunks);

            const callArgs = mockQuery.mock.calls[0][1];
            // Verify null values are passed for optional fields
            expect(callArgs).toContain(null);
        });
    });

    describe("searchSimilar", () => {
        it("should search for similar chunks using vector similarity", async () => {
            const sessionId = generateId();
            const queryEmbedding = generateMockEmbedding();
            const mockResults = [
                {
                    id: generateId(),
                    session_id: sessionId,
                    content: "Matching content",
                    source_name: "doc.pdf",
                    source_type: "file",
                    chunk_index: 0,
                    similarity: 0.95,
                    metadata: "{}"
                },
                {
                    id: generateId(),
                    session_id: sessionId,
                    content: "Another match",
                    source_name: "doc.pdf",
                    source_type: "file",
                    chunk_index: 1,
                    similarity: 0.85,
                    metadata: "{}"
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockResults));

            const result = await repository.searchSimilar({
                sessionId,
                queryEmbedding
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("1 - (embedding <=> $1::vector)"),
                expect.arrayContaining([sessionId])
            );
            expect(result).toHaveLength(2);
            expect(result[0].similarity).toBe(0.95);
        });

        it("should use default topK of 5", async () => {
            const sessionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                sessionId,
                queryEmbedding: [0.1, 0.2]
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LIMIT $4"),
                expect.arrayContaining([5])
            );
        });

        it("should use default similarity threshold of 0.7", async () => {
            const sessionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                sessionId,
                queryEmbedding: [0.1, 0.2]
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([0.7])
            );
        });

        it("should allow custom topK and threshold", async () => {
            const sessionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                sessionId,
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
            const sessionId = generateId();
            const metadata = { page: 3, section: "conclusion" };
            const mockResults = [
                {
                    id: generateId(),
                    session_id: sessionId,
                    content: "Content",
                    source_name: "doc.pdf",
                    source_type: "file",
                    chunk_index: 0,
                    similarity: 0.9,
                    metadata: JSON.stringify(metadata)
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockResults));

            const result = await repository.searchSimilar({
                sessionId,
                queryEmbedding: [0.1]
            });

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should handle metadata as object directly", async () => {
            const sessionId = generateId();
            const metadata = { page: 3 };
            const mockResults = [
                {
                    id: generateId(),
                    session_id: sessionId,
                    content: "Content",
                    source_name: "doc.pdf",
                    source_type: "file",
                    chunk_index: 0,
                    similarity: 0.9,
                    metadata
                }
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockResults));

            const result = await repository.searchSimilar({
                sessionId,
                queryEmbedding: [0.1]
            });

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should return empty array when no matches", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([]));

            const result = await repository.searchSimilar({
                sessionId: generateId(),
                queryEmbedding: [0.1]
            });

            expect(result).toEqual([]);
        });

        it("should order results by similarity (closest first)", async () => {
            const sessionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                sessionId,
                queryEmbedding: [0.1]
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY embedding <=>"),
                expect.anything()
            );
        });
    });

    describe("findBySessionId", () => {
        it("should return all chunks for session", async () => {
            const sessionId = generateId();
            const mockChunks = [
                generateChunkRow({ session_id: sessionId, chunk_index: 0 }),
                generateChunkRow({ session_id: sessionId, chunk_index: 1 })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockChunks));

            const result = await repository.findBySessionId(sessionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE session_id = $1"),
                [sessionId]
            );
            expect(result).toHaveLength(2);
        });

        it("should order by source_index then chunk_index", async () => {
            const sessionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findBySessionId(sessionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY source_index, chunk_index"),
                expect.anything()
            );
        });

        it("should return empty array when no chunks", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([]));

            const result = await repository.findBySessionId(generateId());

            expect(result).toEqual([]);
        });
    });

    describe("countBySessionId", () => {
        it("should return count of chunks", async () => {
            const sessionId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(25));

            const result = await repository.countBySessionId(sessionId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("SELECT COUNT(*)"), [
                sessionId
            ]);
            expect(result).toBe(25);
        });

        it("should return 0 when no chunks", async () => {
            mockQuery.mockResolvedValueOnce(mockCountResult(0));

            const result = await repository.countBySessionId(generateId());

            expect(result).toBe(0);
        });
    });

    describe("deleteBySessionId", () => {
        it("should delete all chunks for session", async () => {
            const sessionId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(10));

            const result = await repository.deleteBySessionId(sessionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.chat_interface_message_chunks"),
                [sessionId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE session_id = $1"),
                [sessionId]
            );
            expect(result).toBe(10);
        });

        it("should return 0 when no chunks exist", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteBySessionId(generateId());

            expect(result).toBe(0);
        });
    });

    describe("deleteByThreadId", () => {
        it("should delete all chunks for thread", async () => {
            const threadId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(5));

            const result = await repository.deleteByThreadId(threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.chat_interface_message_chunks"),
                [threadId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE thread_id = $1"),
                [threadId]
            );
            expect(result).toBe(5);
        });

        it("should return 0 when no chunks exist", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteByThreadId(generateId());

            expect(result).toBe(0);
        });
    });

    describe("row mapping", () => {
        it("should correctly map chunk fields", async () => {
            const sessionId = generateId();
            const threadId = generateId();
            const now = new Date().toISOString();
            const mockChunk = generateChunkRow({
                session_id: sessionId,
                thread_id: threadId,
                source_type: "url",
                source_name: "https://example.com",
                source_index: 2,
                content: "URL content",
                chunk_index: 5,
                created_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySessionId(sessionId);

            expect(result[0].sessionId).toBe(sessionId);
            expect(result[0].threadId).toBe(threadId);
            expect(result[0].sourceType).toBe("url");
            expect(result[0].sourceName).toBe("https://example.com");
            expect(result[0].sourceIndex).toBe(2);
            expect(result[0].chunkIndex).toBe(5);
            expect(result[0].createdAt).toBeInstanceOf(Date);
        });

        it("should parse metadata JSON string", async () => {
            const sessionId = generateId();
            const metadata = { page: 10, heading: "Introduction" };
            const mockChunk = generateChunkRow({
                session_id: sessionId,
                metadata: JSON.stringify(metadata)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySessionId(sessionId);

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should handle metadata as object directly", async () => {
            const sessionId = generateId();
            const metadata = { page: 10 };
            const mockChunk = generateChunkRow({ session_id: sessionId });
            (mockChunk as Record<string, unknown>).metadata = metadata;

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySessionId(sessionId);

            expect(result[0].metadata).toEqual(metadata);
        });

        it("should handle empty metadata", async () => {
            const sessionId = generateId();
            const mockChunk = generateChunkRow({
                session_id: sessionId,
                metadata: "{}"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySessionId(sessionId);

            expect(result[0].metadata).toEqual({});
        });

        it("should handle null embedding", async () => {
            const sessionId = generateId();
            const mockChunk = generateChunkRow({
                session_id: sessionId,
                embedding: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySessionId(sessionId);

            expect(result[0].embedding).toBeNull();
        });

        it("should parse vector string embedding", async () => {
            const sessionId = generateId();
            const mockChunk = generateChunkRow({
                session_id: sessionId,
                embedding: "[0.1,0.2,0.3]"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySessionId(sessionId);

            expect(result[0].embedding).toEqual([0.1, 0.2, 0.3]);
        });

        it("should handle array embedding directly", async () => {
            const sessionId = generateId();
            const mockChunk = generateChunkRow({
                session_id: sessionId
            });
            (mockChunk as Record<string, unknown>).embedding = [0.4, 0.5, 0.6];

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySessionId(sessionId);

            expect(result[0].embedding).toEqual([0.4, 0.5, 0.6]);
        });

        it("should handle null threadId", async () => {
            const sessionId = generateId();
            const mockChunk = generateChunkRow({
                session_id: sessionId,
                thread_id: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockChunk]));

            const result = await repository.findBySessionId(sessionId);

            expect(result[0].threadId).toBeNull();
        });
    });
});
