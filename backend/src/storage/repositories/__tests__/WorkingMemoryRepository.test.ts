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
        it("should return working memory for agent-user pair", async () => {
            const agentId = generateId();
            const userId = generateId();
            const mockRow = {
                agent_id: agentId,
                user_id: userId,
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
            expect(result?.agentId).toBe(agentId);
            expect(result?.userId).toBe(userId);
            expect(result?.workingMemory).toBe("User prefers formal communication.");
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.get(generateId(), generateId());

            expect(result).toBeNull();
        });
    });

    describe("create", () => {
        it("should insert new working memory", async () => {
            const input = {
                agentId: generateId(),
                userId: generateId(),
                workingMemory: "Initial working memory content.",
                metadata: { created_from: "first_conversation" }
            };

            const mockRow = {
                agent_id: input.agentId,
                user_id: input.userId,
                working_memory: input.workingMemory,
                updated_at: new Date(),
                created_at: new Date(),
                metadata: input.metadata
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.agent_working_memory"),
                [input.agentId, input.userId, input.workingMemory, input.metadata]
            );
            expect(result.agentId).toBe(input.agentId);
            expect(result.workingMemory).toBe(input.workingMemory);
        });

        it("should use empty object for metadata when not provided", async () => {
            const input = {
                agentId: generateId(),
                userId: generateId(),
                workingMemory: "Content without metadata"
            };

            const mockRow = {
                agent_id: input.agentId,
                user_id: input.userId,
                working_memory: input.workingMemory,
                updated_at: new Date(),
                created_at: new Date(),
                metadata: {}
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([input.agentId, input.userId, input.workingMemory, {}])
            );
        });
    });

    describe("update", () => {
        it("should upsert working memory", async () => {
            const input = {
                agentId: generateId(),
                userId: generateId(),
                workingMemory: "Updated working memory content.",
                metadata: { updated: true }
            };

            const mockRow = {
                agent_id: input.agentId,
                user_id: input.userId,
                working_memory: input.workingMemory,
                updated_at: new Date(),
                created_at: new Date(),
                metadata: input.metadata
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ON CONFLICT (agent_id, user_id)"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DO UPDATE SET"),
                expect.anything()
            );
            expect(result.workingMemory).toBe(input.workingMemory);
        });

        it("should update timestamp on upsert", async () => {
            const input = {
                agentId: generateId(),
                userId: generateId(),
                workingMemory: "New content"
            };

            const mockRow = {
                agent_id: input.agentId,
                user_id: input.userId,
                working_memory: input.workingMemory,
                updated_at: new Date(),
                created_at: new Date(),
                metadata: {}
            };

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("updated_at = NOW()"),
                expect.anything()
            );
        });
    });

    describe("delete", () => {
        it("should delete working memory and return true", async () => {
            const agentId = generateId();
            const userId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(agentId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agent_working_memory"),
                [agentId, userId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE agent_id = $1 AND user_id = $2"),
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
            const mockRows = [
                {
                    agent_id: agentId,
                    user_id: generateId(),
                    working_memory: "User 1 memory",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                },
                {
                    agent_id: agentId,
                    user_id: generateId(),
                    working_memory: "User 2 memory",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: mockRows,
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
    });

    describe("listByUser", () => {
        it("should return all working memories for user across agents", async () => {
            const userId = generateId();
            const mockRows = [
                {
                    agent_id: generateId(),
                    user_id: userId,
                    working_memory: "Agent 1 memory",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                },
                {
                    agent_id: generateId(),
                    user_id: userId,
                    working_memory: "Agent 2 memory",
                    updated_at: new Date(),
                    created_at: new Date(),
                    metadata: {}
                }
            ];

            mockQuery.mockResolvedValueOnce({
                rows: mockRows,
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
    });

    describe("row mapping", () => {
        it("should correctly map snake_case to camelCase", async () => {
            const agentId = generateId();
            const userId = generateId();
            const mockRow = {
                agent_id: agentId,
                user_id: userId,
                working_memory: "Test content",
                updated_at: new Date("2024-01-15"),
                created_at: new Date("2024-01-01"),
                metadata: { key: "value" }
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.get(agentId, userId);

            expect(result).toEqual({
                agentId: agentId,
                userId: userId,
                workingMemory: "Test content",
                updatedAt: new Date("2024-01-15"),
                createdAt: new Date("2024-01-01"),
                metadata: { key: "value" }
            });
        });
    });
});
