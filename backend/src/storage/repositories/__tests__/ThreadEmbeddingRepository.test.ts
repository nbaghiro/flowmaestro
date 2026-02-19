/**
 * ThreadEmbeddingRepository Tests
 *
 * Tests for conversation embedding operations including creation,
 * batch creation, semantic search with context windows, and deletion.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { ThreadEmbeddingRepository } from "../ThreadEmbeddingRepository";
import {
    mockRows,
    mockInsertReturning,
    mockAffectedRows,
    mockCountResult,
    generateThreadEmbeddingRow,
    generateId
} from "./setup";

describe("ThreadEmbeddingRepository", () => {
    let repository: ThreadEmbeddingRepository;

    beforeEach(() => {
        mockQuery.mockReset();
        repository = new ThreadEmbeddingRepository();
    });

    describe("create", () => {
        it("should insert a new thread embedding", async () => {
            const input = {
                agent_id: generateId(),
                user_id: generateId(),
                execution_id: generateId(),
                thread_id: generateId(),
                message_id: generateId(),
                message_role: "user" as const,
                message_index: 0,
                content: "Hello, how are you?",
                embedding: [0.1, 0.2, 0.3],
                embedding_model: "text-embedding-3-small",
                embedding_provider: "openai"
            };

            const mockRow = generateThreadEmbeddingRow({
                agent_id: input.agent_id,
                user_id: input.user_id,
                execution_id: input.execution_id,
                message_id: input.message_id,
                message_role: input.message_role,
                message_index: input.message_index,
                content: input.content,
                embedding: JSON.stringify(input.embedding),
                embedding_model: input.embedding_model,
                embedding_provider: input.embedding_provider
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.agent_conversation_embeddings"),
                expect.arrayContaining([
                    input.agent_id,
                    input.user_id,
                    input.execution_id,
                    input.message_id,
                    input.message_role,
                    input.message_index,
                    input.content,
                    JSON.stringify(input.embedding),
                    input.embedding_model,
                    input.embedding_provider
                ])
            );
            expect(result.agent_id).toBe(input.agent_id);
            expect(result.message_role).toBe("user");
        });
    });

    describe("createBatch", () => {
        it("should insert multiple embeddings in one query", async () => {
            const executionId = generateId();
            const agentId = generateId();
            const userId = generateId();
            const threadId = generateId();
            const inputs = [
                {
                    agent_id: agentId,
                    user_id: userId,
                    execution_id: executionId,
                    thread_id: threadId,
                    message_id: generateId(),
                    message_role: "user" as const,
                    message_index: 0,
                    content: "User message",
                    embedding: [0.1, 0.2],
                    embedding_model: "text-embedding-3-small",
                    embedding_provider: "openai"
                },
                {
                    agent_id: agentId,
                    user_id: userId,
                    execution_id: executionId,
                    thread_id: threadId,
                    message_id: generateId(),
                    message_role: "assistant" as const,
                    message_index: 1,
                    content: "Assistant response",
                    embedding: [0.3, 0.4],
                    embedding_model: "text-embedding-3-small",
                    embedding_provider: "openai"
                }
            ];

            const mockResults = inputs.map((input, idx) =>
                generateThreadEmbeddingRow({
                    agent_id: input.agent_id,
                    message_index: idx
                })
            );

            mockQuery.mockResolvedValueOnce(mockInsertReturning(mockResults));

            const result = await repository.createBatch(inputs);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ON CONFLICT (execution_id, message_id) DO NOTHING"),
                expect.any(Array)
            );
            expect(result).toHaveLength(2);
        });

        it("should return empty array when no inputs", async () => {
            const result = await repository.createBatch([]);

            expect(result).toEqual([]);
            expect(mockQuery).not.toHaveBeenCalled();
        });
    });

    describe("searchSimilar", () => {
        it("should search for similar messages without context window", async () => {
            const agentId = generateId();
            const userId = generateId();
            const queryEmbedding = [0.1, 0.2, 0.3];

            const mockResults = [
                {
                    id: generateId(),
                    agent_id: agentId,
                    user_id: userId,
                    execution_id: generateId(),
                    message_id: generateId(),
                    message_role: "user",
                    message_index: 0,
                    content: "Similar content",
                    created_at: new Date(),
                    similarity: 0.95
                }
            ];

            // First mock: COUNT query to check if embeddings exist
            mockQuery.mockResolvedValueOnce(mockCountResult(10));
            // Second mock: similarity search results
            mockQuery.mockResolvedValueOnce(mockRows(mockResults));

            const result = await repository.searchSimilar({
                agent_id: agentId,
                user_id: userId,
                query_embedding: queryEmbedding,
                top_k: 5,
                similarity_threshold: 0.7,
                context_window: 0 // No context
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("1 - (embedding <=>"),
                expect.arrayContaining([agentId, userId])
            );
            expect(result).toHaveLength(1);
            expect(result[0].similarity).toBe(0.95);
            expect(result[0].context_before).toBeUndefined();
            expect(result[0].context_after).toBeUndefined();
        });

        it("should search with context window", async () => {
            const agentId = generateId();
            const userId = generateId();
            const executionId = generateId();

            const mockResults = [
                {
                    id: generateId(),
                    agent_id: agentId,
                    user_id: userId,
                    execution_id: executionId,
                    message_id: "msg_2",
                    message_role: "user",
                    message_index: 2,
                    content: "Similar content",
                    created_at: new Date(),
                    similarity: 0.95
                }
            ];

            const mockContext = [
                {
                    ...generateThreadEmbeddingRow({ message_id: "msg_1", message_index: 1 }),
                    execution_id: executionId
                },
                {
                    ...generateThreadEmbeddingRow({ message_id: "msg_2", message_index: 2 }),
                    execution_id: executionId
                },
                {
                    ...generateThreadEmbeddingRow({ message_id: "msg_3", message_index: 3 }),
                    execution_id: executionId
                }
            ];

            // First mock: COUNT query
            mockQuery.mockResolvedValueOnce(mockCountResult(10));
            // Second mock: similarity search results
            mockQuery.mockResolvedValueOnce(mockRows(mockResults));
            // Third mock: context window query
            mockQuery.mockResolvedValueOnce(mockRows(mockContext));

            const result = await repository.searchSimilar({
                agent_id: agentId,
                user_id: userId,
                query_embedding: [0.1, 0.2],
                top_k: 5,
                context_window: 2
            });

            expect(result).toHaveLength(1);
            expect(result[0].context_before).toBeDefined();
            expect(result[0].context_after).toBeDefined();
        });

        it("should filter by execution_id when provided", async () => {
            const agentId = generateId();
            const userId = generateId();
            const executionId = generateId();

            // First mock: COUNT query
            mockQuery.mockResolvedValueOnce(mockCountResult(10));
            // Second mock: similarity search (empty results)
            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                agent_id: agentId,
                user_id: userId,
                query_embedding: [0.1, 0.2],
                execution_id: executionId,
                context_window: 0
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("execution_id = $"),
                expect.arrayContaining([agentId, userId, executionId])
            );
        });

        it("should exclude execution_id when provided", async () => {
            const agentId = generateId();
            const userId = generateId();
            const excludeId = generateId();

            // First mock: COUNT query
            mockQuery.mockResolvedValueOnce(mockCountResult(10));
            // Second mock: similarity search (empty results)
            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                agent_id: agentId,
                user_id: userId,
                query_embedding: [0.1, 0.2],
                exclude_execution_id: excludeId,
                context_window: 0
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("execution_id != $"),
                expect.arrayContaining([agentId, userId, excludeId])
            );
        });

        it("should filter by message_roles when provided", async () => {
            const agentId = generateId();
            const userId = generateId();

            // First mock: COUNT query
            mockQuery.mockResolvedValueOnce(mockCountResult(10));
            // Second mock: similarity search (empty results)
            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.searchSimilar({
                agent_id: agentId,
                user_id: userId,
                query_embedding: [0.1, 0.2],
                message_roles: ["user", "assistant"],
                context_window: 0
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("message_role = ANY($"),
                expect.arrayContaining([agentId, userId, ["user", "assistant"]])
            );
        });

        it("should return empty array when no similar messages found", async () => {
            // Mock COUNT returning 0 - should return early
            mockQuery.mockResolvedValueOnce(mockCountResult(0));

            const result = await repository.searchSimilar({
                agent_id: generateId(),
                user_id: generateId(),
                query_embedding: [0.1, 0.2],
                context_window: 0
            });

            expect(result).toEqual([]);
        });
    });

    describe("findByExecution", () => {
        it("should return embeddings for execution ordered by index", async () => {
            const executionId = generateId();
            const mockEmbeddings = [
                generateThreadEmbeddingRow({ execution_id: executionId, message_index: 0 }),
                generateThreadEmbeddingRow({ execution_id: executionId, message_index: 1 }),
                generateThreadEmbeddingRow({ execution_id: executionId, message_index: 2 })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockEmbeddings));

            const result = await repository.findByExecution(executionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE execution_id = $1"),
                [executionId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY message_index ASC"),
                expect.anything()
            );
            expect(result).toHaveLength(3);
        });
    });

    describe("deleteByExecution", () => {
        it("should delete all embeddings for execution", async () => {
            const executionId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(10));

            const result = await repository.deleteByExecution(executionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agent_conversation_embeddings"),
                [executionId]
            );
            expect(result).toBe(10);
        });
    });

    describe("getCount", () => {
        it("should return count of embeddings for agent-user pair", async () => {
            const agentId = generateId();
            const userId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(50));

            const result = await repository.getCount(agentId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE agent_id = $1 AND user_id = $2"),
                [agentId, userId]
            );
            expect(result).toBe(50);
        });
    });

    describe("getLatest", () => {
        it("should return latest embeddings for agent-user pair", async () => {
            const agentId = generateId();
            const userId = generateId();
            const mockEmbeddings = [
                generateThreadEmbeddingRow({ agent_id: agentId, user_id: userId }),
                generateThreadEmbeddingRow({ agent_id: agentId, user_id: userId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockEmbeddings));

            const result = await repository.getLatest(agentId, userId, 10);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE agent_id = $1 AND user_id = $2"),
                [agentId, userId, 10]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at DESC"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("LIMIT $3"),
                expect.anything()
            );
            expect(result).toHaveLength(2);
        });

        it("should use default limit of 10", async () => {
            const agentId = generateId();
            const userId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.getLatest(agentId, userId);

            expect(mockQuery).toHaveBeenCalledWith(expect.anything(), [agentId, userId, 10]);
        });
    });

    describe("deleteByAgent", () => {
        it("should delete all embeddings for an agent and return count", async () => {
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(100));

            const result = await repository.deleteByAgent(agentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agent_conversation_embeddings"),
                [agentId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE agent_id = $1"),
                expect.anything()
            );
            expect(result).toBe(100);
        });

        it("should return 0 when no embeddings to delete", async () => {
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteByAgent(agentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agent_conversation_embeddings"),
                [agentId]
            );
            expect(result).toBe(0);
        });
    });
});
