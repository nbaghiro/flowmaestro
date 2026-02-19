/**
 * WorkingMemoryRepository Tests
 *
 * Tests for agent working memory operations including get, create,
 * update (upsert), delete, and listing by agent or user.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { WorkingMemoryRepository } from "../WorkingMemoryRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    generateId
} from "./setup";

describe("WorkingMemoryRepository", () => {
    let repository: WorkingMemoryRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new WorkingMemoryRepository();
    });

    describe("get", () => {
        it("should return global working memory for agent-user pair", async () => {
            const agentId = generateId();
            const userId = generateId();
            const mockRow = {
                id: generateId(),
                agent_id: agentId,
                user_id: userId,
                thread_id: null,
                working_memory: "User prefers formal communication.",
                updated_at: new Date(),
                created_at: new Date(),
                metadata: { last_topic: "AI" }
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.get(agentId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE agent_id = $1 AND user_id = $2"),
                [agentId, userId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("thread_id IS NULL"),
                expect.anything()
            );
            expect(result?.agentId).toBe(agentId);
            expect(result?.userId).toBe(userId);
            expect(result?.threadId).toBeNull();
            expect(result?.workingMemory).toBe("User prefers formal communication.");
        });

        it("should return thread-scoped working memory", async () => {
            const agentId = generateId();
            const userId = generateId();
            const threadId = generateId();
            const mockRow = {
                id: generateId(),
                agent_id: agentId,
                user_id: userId,
                thread_id: threadId,
                working_memory: "Thread-specific memory.",
                updated_at: new Date(),
                created_at: new Date(),
                metadata: {}
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.get(agentId, userId, threadId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("thread_id = $3"), [
                agentId,
                userId,
                threadId
            ]);
            expect(result?.threadId).toBe(threadId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.get(generateId(), generateId());

            expect(result).toBeNull();
        });
    });

    describe("create", () => {
        it("should insert new global working memory", async () => {
            const input = {
                agentId: generateId(),
                userId: generateId(),
                workingMemory: "Initial working memory content.",
                metadata: { created_from: "first_conversation" }
            };

            const mockRow = {
                id: generateId(),
                agent_id: input.agentId,
                user_id: input.userId,
                thread_id: null,
                working_memory: input.workingMemory,
                updated_at: new Date(),
                created_at: new Date(),
                metadata: input.metadata
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.agent_working_memory"),
                [input.agentId, input.userId, null, input.workingMemory, input.metadata]
            );
            expect(result.agentId).toBe(input.agentId);
            expect(result.workingMemory).toBe(input.workingMemory);
            expect(result.threadId).toBeNull();
        });

        it("should insert thread-scoped working memory", async () => {
            const threadId = generateId();
            const input = {
                agentId: generateId(),
                userId: generateId(),
                threadId,
                workingMemory: "Thread-specific memory.",
                metadata: {}
            };

            const mockRow = {
                id: generateId(),
                agent_id: input.agentId,
                user_id: input.userId,
                thread_id: threadId,
                working_memory: input.workingMemory,
                updated_at: new Date(),
                created_at: new Date(),
                metadata: input.metadata
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    input.agentId,
                    input.userId,
                    threadId,
                    input.workingMemory,
                    input.metadata
                ])
            );
            expect(result.threadId).toBe(threadId);
        });

        it("should use empty object for metadata when not provided", async () => {
            const input = {
                agentId: generateId(),
                userId: generateId(),
                workingMemory: "Content without metadata"
            };

            const mockRow = {
                id: generateId(),
                agent_id: input.agentId,
                user_id: input.userId,
                thread_id: null,
                working_memory: input.workingMemory,
                updated_at: new Date(),
                created_at: new Date(),
                metadata: {}
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([input.agentId, input.userId, null, input.workingMemory, {}])
            );
        });
    });

    describe("update", () => {
        it("should update existing working memory", async () => {
            const memoryId = generateId();
            const input = {
                agentId: generateId(),
                userId: generateId(),
                workingMemory: "Updated working memory content.",
                metadata: { updated: true }
            };

            const existingRow = {
                id: memoryId,
                agent_id: input.agentId,
                user_id: input.userId,
                thread_id: null,
                working_memory: "Old content",
                updated_at: new Date(),
                created_at: new Date(),
                metadata: {}
            };

            const updatedRow = {
                ...existingRow,
                working_memory: input.workingMemory,
                metadata: input.metadata
            };

            // First call - get existing
            mockQuery.mockResolvedValueOnce(mockRows([existingRow]));
            // Second call - update
            mockQuery.mockResolvedValueOnce(mockInsertReturning([updatedRow]));

            const result = await repository.update(input);

            expect(mockQuery).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("UPDATE flowmaestro.agent_working_memory"),
                expect.anything()
            );
            expect(result.workingMemory).toBe(input.workingMemory);
        });

        it("should create new memory when not exists", async () => {
            const input = {
                agentId: generateId(),
                userId: generateId(),
                workingMemory: "New content"
            };

            const newRow = {
                id: generateId(),
                agent_id: input.agentId,
                user_id: input.userId,
                thread_id: null,
                working_memory: input.workingMemory,
                updated_at: new Date(),
                created_at: new Date(),
                metadata: {}
            };

            // First call - get returns empty
            mockQuery.mockResolvedValueOnce(mockEmptyResult());
            // Second call - create
            mockQuery.mockResolvedValueOnce(mockInsertReturning([newRow]));

            const result = await repository.update(input);

            expect(mockQuery).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("INSERT INTO flowmaestro.agent_working_memory"),
                expect.anything()
            );
            expect(result.workingMemory).toBe(input.workingMemory);
        });
    });

    describe("delete", () => {
        it("should delete global working memory and return true", async () => {
            const agentId = generateId();
            const userId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(agentId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agent_working_memory"),
                [agentId, userId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("thread_id IS NULL"),
                expect.anything()
            );
            expect(result).toBe(true);
        });

        it("should delete thread-scoped working memory", async () => {
            const agentId = generateId();
            const userId = generateId();
            const threadId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(agentId, userId, threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agent_working_memory"),
                [agentId, userId, threadId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("thread_id = $3"),
                expect.anything()
            );
            expect(result).toBe(true);
        });

        it("should return false when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete(generateId(), generateId());

            expect(result).toBe(false);
        });
    });

    describe("listByAgent", () => {
        it("should return all working memories for agent", async () => {
            const agentId = generateId();
            const mockRowsData = [
                {
                    id: generateId(),
                    agent_id: agentId,
                    user_id: generateId(),
                    thread_id: null,
                    working_memory: "User 1 memory",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                },
                {
                    id: generateId(),
                    agent_id: agentId,
                    user_id: generateId(),
                    thread_id: generateId(),
                    working_memory: "User 2 memory",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: mockRowsData,
                rowCount: 2,
                command: "SELECT",
                oid: 0,
                fields: []
            });

            const result = await repository.listByAgent(agentId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE agent_id = $1"), [
                agentId
            ]);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY updated_at DESC"),
                expect.anything()
            );
            expect(result).toHaveLength(2);
        });

        it("should filter to global only when globalOnly is true", async () => {
            const agentId = generateId();
            const mockRowsData = [
                {
                    id: generateId(),
                    agent_id: agentId,
                    user_id: generateId(),
                    thread_id: null,
                    working_memory: "Global memory",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: mockRowsData,
                rowCount: 1,
                command: "SELECT",
                oid: 0,
                fields: []
            });

            const result = await repository.listByAgent(agentId, true);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND thread_id IS NULL"),
                [agentId]
            );
            expect(result).toHaveLength(1);
        });
    });

    describe("listByUser", () => {
        it("should return all working memories for user across agents", async () => {
            const userId = generateId();
            const mockRowsData = [
                {
                    id: generateId(),
                    agent_id: generateId(),
                    user_id: userId,
                    thread_id: null,
                    working_memory: "Agent 1 memory",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                },
                {
                    id: generateId(),
                    agent_id: generateId(),
                    user_id: userId,
                    thread_id: generateId(),
                    working_memory: "Agent 2 memory",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: mockRowsData,
                rowCount: 2,
                command: "SELECT",
                oid: 0,
                fields: []
            });

            const result = await repository.listByUser(userId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1"), [
                userId
            ]);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY updated_at DESC"),
                expect.anything()
            );
            expect(result).toHaveLength(2);
        });

        it("should filter to global only when globalOnly is true", async () => {
            const userId = generateId();
            const mockRowsData = [
                {
                    id: generateId(),
                    agent_id: generateId(),
                    user_id: userId,
                    thread_id: null,
                    working_memory: "Global memory",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: mockRowsData,
                rowCount: 1,
                command: "SELECT",
                oid: 0,
                fields: []
            });

            const result = await repository.listByUser(userId, true);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND thread_id IS NULL"),
                [userId]
            );
            expect(result).toHaveLength(1);
        });
    });

    describe("listByThread", () => {
        it("should return all working memories for a thread", async () => {
            const threadId = generateId();
            const mockRowsData = [
                {
                    id: generateId(),
                    agent_id: generateId(),
                    user_id: generateId(),
                    thread_id: threadId,
                    working_memory: "Memory 1",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                },
                {
                    id: generateId(),
                    agent_id: generateId(),
                    user_id: generateId(),
                    thread_id: threadId,
                    working_memory: "Memory 2",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: mockRowsData,
                rowCount: 2,
                command: "SELECT",
                oid: 0,
                fields: []
            });

            const result = await repository.listByThread(threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE thread_id = $1"),
                [threadId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY updated_at DESC"),
                expect.anything()
            );
            expect(result).toHaveLength(2);
            expect(result[0].threadId).toBe(threadId);
        });

        it("should return empty array when no memories for thread", async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [],
                rowCount: 0,
                command: "SELECT",
                oid: 0,
                fields: []
            });

            const result = await repository.listByThread(generateId());

            expect(result).toHaveLength(0);
        });
    });

    describe("deleteByThread", () => {
        it("should delete all memories for a thread and return count", async () => {
            const threadId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(3));

            const result = await repository.deleteByThread(threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agent_working_memory"),
                [threadId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE thread_id = $1"),
                expect.anything()
            );
            expect(result).toBe(3);
        });

        it("should return 0 when no memories to delete", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteByThread(generateId());

            expect(result).toBe(0);
        });
    });

    describe("deleteByAgent", () => {
        it("should delete all memories for an agent and return count", async () => {
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(5));

            const result = await repository.deleteByAgent(agentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agent_working_memory"),
                [agentId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE agent_id = $1"),
                expect.anything()
            );
            expect(result).toBe(5);
        });

        it("should return 0 when no memories to delete", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteByAgent(generateId());

            expect(result).toBe(0);
        });
    });

    describe("row mapping", () => {
        it("should correctly map snake_case to camelCase", async () => {
            const agentId = generateId();
            const userId = generateId();
            const threadId = generateId();
            const mockRow = {
                id: generateId(),
                agent_id: agentId,
                user_id: userId,
                thread_id: threadId,
                working_memory: "Test content",
                updated_at: new Date("2024-01-15"),
                created_at: new Date("2024-01-01"),
                metadata: { key: "value" }
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.get(agentId, userId, threadId);

            expect(result).toEqual({
                id: mockRow.id,
                agentId: agentId,
                userId: userId,
                threadId: threadId,
                workingMemory: "Test content",
                updatedAt: new Date("2024-01-15"),
                createdAt: new Date("2024-01-01"),
                metadata: { key: "value" }
            });
        });

        it("should handle null threadId correctly", async () => {
            const agentId = generateId();
            const userId = generateId();
            const mockRow = {
                id: generateId(),
                agent_id: agentId,
                user_id: userId,
                thread_id: null,
                working_memory: "Global memory",
                updated_at: new Date("2024-01-15"),
                created_at: new Date("2024-01-01"),
                metadata: {}
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.get(agentId, userId);

            expect(result?.threadId).toBeNull();
        });
    });
});
