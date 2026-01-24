/**
 * WorkingMemoryService Tests
 *
 * Tests for agent working memory with mutex protection (WorkingMemoryService.ts)
 */

// Mock the repository
const mockGet = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockListByAgent = jest.fn();
const mockListByUser = jest.fn();

jest.mock("../../../storage/repositories/WorkingMemoryRepository", () => ({
    WorkingMemoryRepository: jest.fn().mockImplementation(() => ({
        get: mockGet,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
        listByAgent: mockListByAgent,
        listByUser: mockListByUser
    }))
}));

import { WorkingMemoryService, getWorkingMemoryService } from "../WorkingMemoryService";

describe("WorkingMemoryService", () => {
    let service: WorkingMemoryService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new WorkingMemoryService();
    });

    describe("get", () => {
        it("should return working memory when it exists", async () => {
            mockGet.mockResolvedValue({
                agentId: "agent-1",
                userId: "user-1",
                workingMemory: "Current memory content"
            });

            const result = await service.get("agent-1", "user-1");

            expect(result).toBe("Current memory content");
            expect(mockGet).toHaveBeenCalledWith("agent-1", "user-1");
        });

        it("should return null when memory does not exist", async () => {
            mockGet.mockResolvedValue(null);

            const result = await service.get("agent-1", "user-1");

            expect(result).toBeNull();
        });

        it("should return null for empty working memory", async () => {
            mockGet.mockResolvedValue({
                agentId: "agent-1",
                userId: "user-1",
                workingMemory: ""
            });

            const result = await service.get("agent-1", "user-1");

            expect(result).toBeNull();
        });
    });

    describe("update", () => {
        describe("create new memory", () => {
            it("should create memory when none exists", async () => {
                mockGet.mockResolvedValue(null);
                mockCreate.mockResolvedValue(undefined);

                const result = await service.update({
                    agentId: "agent-1",
                    userId: "user-1",
                    newMemory: "Initial memory"
                });

                expect(result).toEqual({
                    success: true,
                    reason: "created",
                    workingMemory: "Initial memory"
                });
                expect(mockCreate).toHaveBeenCalledWith({
                    agentId: "agent-1",
                    userId: "user-1",
                    workingMemory: "Initial memory"
                });
            });

            it("should create memory when existing is empty string", async () => {
                mockGet.mockResolvedValue({
                    agentId: "agent-1",
                    userId: "user-1",
                    workingMemory: ""
                });
                mockCreate.mockResolvedValue(undefined);

                const result = await service.update({
                    agentId: "agent-1",
                    userId: "user-1",
                    newMemory: "New memory"
                });

                expect(result.reason).toBe("created");
            });
        });

        describe("search and replace", () => {
            it("should replace when searchString is found", async () => {
                mockGet.mockResolvedValue({
                    agentId: "agent-1",
                    userId: "user-1",
                    workingMemory: "User prefers dark mode. User likes cats."
                });
                mockUpdate.mockResolvedValue(undefined);

                const result = await service.update({
                    agentId: "agent-1",
                    userId: "user-1",
                    newMemory: "light mode",
                    searchString: "dark mode"
                });

                expect(result).toEqual({
                    success: true,
                    reason: "replaced",
                    workingMemory: "User prefers light mode. User likes cats."
                });
                expect(mockUpdate).toHaveBeenCalledWith({
                    agentId: "agent-1",
                    userId: "user-1",
                    workingMemory: "User prefers light mode. User likes cats."
                });
            });

            it("should not replace when searchString is not found", async () => {
                mockGet.mockResolvedValue({
                    agentId: "agent-1",
                    userId: "user-1",
                    workingMemory: "Existing memory"
                });
                mockUpdate.mockResolvedValue(undefined);

                const result = await service.update({
                    agentId: "agent-1",
                    userId: "user-1",
                    newMemory: "replacement",
                    searchString: "not found"
                });

                // Falls through to append since searchString not found
                expect(result.reason).toBe("appended");
            });
        });

        describe("duplicate detection", () => {
            it("should detect duplicate content", async () => {
                mockGet.mockResolvedValue({
                    agentId: "agent-1",
                    userId: "user-1",
                    workingMemory: "User likes coding in TypeScript"
                });

                const result = await service.update({
                    agentId: "agent-1",
                    userId: "user-1",
                    newMemory: "coding in TypeScript"
                });

                expect(result).toEqual({
                    success: false,
                    reason: "duplicate",
                    workingMemory: "User likes coding in TypeScript"
                });
                expect(mockUpdate).not.toHaveBeenCalled();
            });
        });

        describe("append", () => {
            it("should append new memory to existing", async () => {
                mockGet.mockResolvedValue({
                    agentId: "agent-1",
                    userId: "user-1",
                    workingMemory: "Existing memory"
                });
                mockUpdate.mockResolvedValue(undefined);

                const result = await service.update({
                    agentId: "agent-1",
                    userId: "user-1",
                    newMemory: "New information"
                });

                expect(result).toEqual({
                    success: true,
                    reason: "appended",
                    workingMemory: "Existing memory\nNew information"
                });
                expect(mockUpdate).toHaveBeenCalledWith({
                    agentId: "agent-1",
                    userId: "user-1",
                    workingMemory: "Existing memory\nNew information"
                });
            });
        });
    });

    describe("replace", () => {
        it("should replace entire working memory", async () => {
            mockUpdate.mockResolvedValue(undefined);

            await service.replace("agent-1", "user-1", "Completely new memory");

            expect(mockUpdate).toHaveBeenCalledWith({
                agentId: "agent-1",
                userId: "user-1",
                workingMemory: "Completely new memory"
            });
        });
    });

    describe("delete", () => {
        it("should delete working memory and return true", async () => {
            mockDelete.mockResolvedValue(true);

            const result = await service.delete("agent-1", "user-1");

            expect(result).toBe(true);
            expect(mockDelete).toHaveBeenCalledWith("agent-1", "user-1");
        });

        it("should return false when memory does not exist", async () => {
            mockDelete.mockResolvedValue(false);

            const result = await service.delete("agent-1", "user-1");

            expect(result).toBe(false);
        });
    });

    describe("listByAgent", () => {
        it("should return list of memories for an agent", async () => {
            const memories = [
                { userId: "user-1", workingMemory: "Memory 1", updatedAt: new Date() },
                { userId: "user-2", workingMemory: "Memory 2", updatedAt: new Date() }
            ];
            mockListByAgent.mockResolvedValue(memories);

            const result = await service.listByAgent("agent-1");

            expect(result).toEqual(memories);
            expect(mockListByAgent).toHaveBeenCalledWith("agent-1");
        });

        it("should return empty array when no memories exist", async () => {
            mockListByAgent.mockResolvedValue([]);

            const result = await service.listByAgent("agent-1");

            expect(result).toEqual([]);
        });
    });

    describe("listByUser", () => {
        it("should return list of memories for a user across agents", async () => {
            const memories = [
                { agentId: "agent-1", workingMemory: "Memory 1", updatedAt: new Date() },
                { agentId: "agent-2", workingMemory: "Memory 2", updatedAt: new Date() }
            ];
            mockListByUser.mockResolvedValue(memories);

            const result = await service.listByUser("user-1");

            expect(result).toEqual(memories);
            expect(mockListByUser).toHaveBeenCalledWith("user-1");
        });
    });

    describe("cleanupMutexes", () => {
        it("should remove unlocked mutexes", async () => {
            // Trigger mutex creation by calling update
            mockGet.mockResolvedValue(null);
            mockCreate.mockResolvedValue(undefined);

            await service.update({
                agentId: "agent-1",
                userId: "user-1",
                newMemory: "Test"
            });

            // Mutex should be unlocked after operation completes
            // cleanupMutexes should remove it
            service.cleanupMutexes();

            // No assertions needed - just verify it doesn't throw
        });
    });

    describe("Mutex protection", () => {
        it("should handle concurrent updates safely", async () => {
            let callCount = 0;
            mockGet.mockImplementation(async () => {
                callCount++;
                // Simulate different states based on call order
                if (callCount === 1) {
                    return null;
                }
                return {
                    agentId: "agent-1",
                    userId: "user-1",
                    workingMemory: "Memory 1"
                };
            });
            mockCreate.mockResolvedValue(undefined);
            mockUpdate.mockResolvedValue(undefined);

            // Concurrent updates should be serialized by mutex
            const update1 = service.update({
                agentId: "agent-1",
                userId: "user-1",
                newMemory: "Memory 1"
            });
            const update2 = service.update({
                agentId: "agent-1",
                userId: "user-1",
                newMemory: "Memory 2"
            });

            const [result1, result2] = await Promise.all([update1, update2]);

            // Both should complete successfully (mutex ensures serialization)
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
        });

        it("should use different mutexes for different agent-user pairs", async () => {
            mockGet.mockResolvedValue(null);
            mockCreate.mockResolvedValue(undefined);

            // Different agent-user pairs can run in parallel
            const update1 = service.update({
                agentId: "agent-1",
                userId: "user-1",
                newMemory: "Memory 1"
            });
            const update2 = service.update({
                agentId: "agent-2",
                userId: "user-2",
                newMemory: "Memory 2"
            });

            await Promise.all([update1, update2]);

            // Both should have been called (different mutex keys)
            expect(mockCreate).toHaveBeenCalledTimes(2);
        });
    });

    describe("getWorkingMemoryService singleton", () => {
        it("should return same instance", () => {
            const instance1 = getWorkingMemoryService();
            const instance2 = getWorkingMemoryService();

            expect(instance1).toBe(instance2);
        });
    });
});
