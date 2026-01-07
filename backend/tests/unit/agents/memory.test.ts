/**
 * Agent Memory Activities Unit Tests
 *
 * Tests for: thread management, semantic search, working memory, and memory tools
 */

// Mock logger utilities first
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

jest.mock("../../../src/temporal/core", () => ({
    activityLogger: mockLogger,
    createActivityLogger: jest.fn(() => mockLogger)
}));

// Create shared mock instance for ThreadMemoryService that can be configured per test
const mockThreadMemoryServiceInstance = {
    storeThreadEmbeddings: jest.fn(),
    searchThreadMemory: jest.fn(),
    formatSearchResultsForLLM: jest.fn(),
    getMemoryStats: jest.fn(),
    clearExecutionMemory: jest.fn()
};

// Mock all external dependencies before imports
jest.mock("../../../src/storage/database");
jest.mock("../../../src/storage/repositories/AgentExecutionRepository");
jest.mock("../../../src/services/agents/ThreadManager");
jest.mock("../../../src/services/agents/ThreadMemoryService", () => {
    return {
        ThreadMemoryService: jest.fn().mockImplementation(() => mockThreadMemoryServiceInstance)
    };
});
jest.mock("../../../src/services/agents/WorkingMemoryService");
jest.mock("../../../src/core/observability");
jest.mock("../../../src/temporal/activities/agents/streaming");

import { calculateCost } from "../../../src/core/observability";
import { ThreadManager } from "../../../src/services/agents/ThreadManager";
import { getWorkingMemoryService } from "../../../src/services/agents/WorkingMemoryService";
import { db } from "../../../src/storage/database";
import {
    loadThreadHistory,
    saveThreadIncremental,
    updateThreadTokens,
    convertToOpenAI,
    convertToAnthropic,
    storeThreadEmbeddings,
    searchThreadMemory,
    getThreadMemoryStats,
    clearExecutionMemory,
    createThreadMemoryTool,
    injectThreadMemoryTool,
    createWorkingMemoryTool,
    executeUpdateWorkingMemory,
    getWorkingMemoryForAgent,
    isWorkingMemoryEnabled,
    createReadSharedMemoryTool,
    createWriteSharedMemoryTool,
    createSearchSharedMemoryTool,
    injectSharedMemoryTools,
    isSharedMemoryTool
} from "../../../src/temporal/activities/agents/memory";
import { emitTokensUpdated } from "../../../src/temporal/activities/agents/streaming";

import type { Tool } from "../../../src/storage/models/Agent";
import type { ThreadMessage } from "../../../src/storage/models/AgentExecution";

const mockDb = jest.mocked(db);
const mockThreadManager = jest.mocked(ThreadManager);
const mockGetWorkingMemoryService = jest.mocked(getWorkingMemoryService);
const mockCalculateCost = jest.mocked(calculateCost);
const mockEmitTokensUpdated = jest.mocked(emitTokensUpdated);

describe("Agent Memory Activities", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("loadThreadHistory", () => {
        // Note: loadThreadHistory tests require execution repo mocks. These are tested
        // through integration tests. Basic behavior is validated here.

        it("should throw error when execution not found", async () => {
            // The module-level mock returns undefined by default
            await expect(loadThreadHistory({ executionId: "nonexistent" })).rejects.toThrow(
                "Execution nonexistent not found"
            );
        });
    });

    describe("saveThreadIncremental", () => {
        it("should return zero saved when no messages provided", async () => {
            const result = await saveThreadIncremental({
                executionId: "exec-1",
                threadId: "thread-1",
                messages: []
            });

            expect(result).toEqual({ saved: 0 });
        });

        // Note: Other saveThreadIncremental tests require complex mock setup that
        // is better tested through integration tests.
    });

    describe("updateThreadTokens", () => {
        it("should update thread token usage", async () => {
            mockDb.query
                .mockResolvedValueOnce({
                    rows: [{ token_usage: null }],
                    rowCount: 1,
                    command: "SELECT",
                    fields: [],
                    oid: 0
                })
                .mockResolvedValueOnce({
                    rows: [],
                    rowCount: 1,
                    command: "UPDATE",
                    fields: [],
                    oid: 0
                });

            mockCalculateCost.mockReturnValue({
                totalCost: 0.001,
                inputCost: 0.0005,
                outputCost: 0.0005,
                pricing: null,
                found: true
            });

            mockEmitTokensUpdated.mockResolvedValue();

            await updateThreadTokens({
                threadId: "thread-1",
                executionId: "exec-1",
                usage: {
                    promptTokens: 100,
                    completionTokens: 50,
                    totalTokens: 150
                },
                provider: "openai",
                model: "gpt-4"
            });

            expect(mockDb.query).toHaveBeenCalledTimes(2);
            expect(mockEmitTokensUpdated).toHaveBeenCalledWith(
                expect.objectContaining({
                    threadId: "thread-1",
                    executionId: "exec-1"
                })
            );
        });

        it("should accumulate token usage across executions", async () => {
            mockDb.query
                .mockResolvedValueOnce({
                    rows: [
                        {
                            token_usage: {
                                promptTokens: 100,
                                completionTokens: 50,
                                totalTokens: 150,
                                totalCost: 0.001,
                                executionCount: 1
                            }
                        }
                    ],
                    rowCount: 1,
                    command: "SELECT",
                    fields: [],
                    oid: 0
                })
                .mockResolvedValueOnce({
                    rows: [],
                    rowCount: 1,
                    command: "UPDATE",
                    fields: [],
                    oid: 0
                });

            mockCalculateCost.mockReturnValue({
                totalCost: 0.002,
                inputCost: 0.001,
                outputCost: 0.001,
                pricing: null,
                found: true
            });

            mockEmitTokensUpdated.mockResolvedValue();

            await updateThreadTokens({
                threadId: "thread-1",
                executionId: "exec-2",
                usage: {
                    promptTokens: 200,
                    completionTokens: 100,
                    totalTokens: 300
                },
                provider: "openai",
                model: "gpt-4"
            });

            // Verify the accumulated values in the emit call
            expect(mockEmitTokensUpdated).toHaveBeenCalledWith(
                expect.objectContaining({
                    tokenUsage: expect.objectContaining({
                        promptTokens: 300, // 100 + 200
                        completionTokens: 150, // 50 + 100
                        totalTokens: 450, // 150 + 300
                        executionCount: 2
                    })
                })
            );
        });
    });

    describe("convertToOpenAI", () => {
        it("should convert messages to OpenAI format", async () => {
            const mockMessages: ThreadMessage[] = [
                { id: "msg-1", role: "system", content: "You are helpful", timestamp: new Date() },
                { id: "msg-2", role: "user", content: "Hello", timestamp: new Date() }
            ];

            const mockThreadManagerInstance = {
                addFromMemory: jest.fn(),
                toOpenAI: jest.fn().mockReturnValue([
                    { role: "system", content: "You are helpful" },
                    { role: "user", content: "Hello" }
                ])
            };
            mockThreadManager.mockImplementation(
                () => mockThreadManagerInstance as unknown as ThreadManager
            );

            const result = await convertToOpenAI({ messages: mockMessages });

            expect(mockThreadManagerInstance.addFromMemory).toHaveBeenCalledWith(mockMessages);
            expect(mockThreadManagerInstance.toOpenAI).toHaveBeenCalled();
            expect(result).toHaveLength(2);
        });
    });

    describe("convertToAnthropic", () => {
        it("should convert messages to Anthropic format", async () => {
            const mockMessages: ThreadMessage[] = [
                { id: "msg-1", role: "system", content: "You are helpful", timestamp: new Date() },
                { id: "msg-2", role: "user", content: "Hello", timestamp: new Date() }
            ];

            const mockThreadManagerInstance = {
                addFromMemory: jest.fn(),
                toAnthropic: jest.fn().mockReturnValue({
                    system: "You are helpful",
                    messages: [{ role: "user", content: "Hello" }]
                })
            };
            mockThreadManager.mockImplementation(
                () => mockThreadManagerInstance as unknown as ThreadManager
            );

            const result = await convertToAnthropic({ messages: mockMessages });

            expect(result).toHaveProperty("system", "You are helpful");
            expect(result).toHaveProperty("messages");
            expect(result.messages).toHaveLength(1);
        });
    });

    describe("storeThreadEmbeddings", () => {
        it("should store embeddings for messages", async () => {
            const mockMessages: ThreadMessage[] = [
                { id: "msg-1", role: "user", content: "Test message", timestamp: new Date() }
            ];

            // Set up mock return value using the shared instance
            mockThreadMemoryServiceInstance.storeThreadEmbeddings.mockResolvedValue({
                stored: 1,
                skipped: 0
            });

            const result = await storeThreadEmbeddings({
                agentId: "agent-1",
                userId: "user-1",
                executionId: "exec-1",
                messages: mockMessages
            });

            expect(result).toEqual({ stored: 1, skipped: 0 });
            expect(mockThreadMemoryServiceInstance.storeThreadEmbeddings).toHaveBeenCalledWith({
                agentId: "agent-1",
                userId: "user-1",
                executionId: "exec-1",
                messages: mockMessages,
                embeddingModel: "text-embedding-3-small",
                embeddingProvider: "openai"
            });
        });
    });

    describe("searchThreadMemory", () => {
        it("should search thread memory with semantic similarity", async () => {
            const mockSearchResult = {
                query: "test query",
                results: [
                    {
                        message_id: "msg-1",
                        message_role: "user",
                        content: "Test content",
                        similarity: 0.85,
                        execution_id: "exec-1"
                    }
                ],
                totalResults: 1,
                contextWindowSize: 2
            };

            // Set up mock return values using the shared instance
            mockThreadMemoryServiceInstance.searchThreadMemory.mockResolvedValue(mockSearchResult);
            mockThreadMemoryServiceInstance.formatSearchResultsForLLM.mockReturnValue(
                "Formatted results"
            );

            const result = await searchThreadMemory({
                agentId: "agent-1",
                userId: "user-1",
                query: "test query"
            });

            expect(result).toHaveProperty("query", "test query");
            expect(result).toHaveProperty("totalResults", 1);
            expect(result).toHaveProperty("formattedForLLM", "Formatted results");
            expect(mockThreadMemoryServiceInstance.searchThreadMemory).toHaveBeenCalled();
        });
    });

    describe("getThreadMemoryStats", () => {
        it("should return memory statistics", async () => {
            const mockStats = {
                totalMessages: 100,
                latestMessages: 10
            };

            // Set up mock return value using the shared instance
            mockThreadMemoryServiceInstance.getMemoryStats.mockResolvedValue(mockStats);

            const result = await getThreadMemoryStats({
                agentId: "agent-1",
                userId: "user-1"
            });

            expect(result).toEqual(mockStats);
            expect(mockThreadMemoryServiceInstance.getMemoryStats).toHaveBeenCalledWith(
                "agent-1",
                "user-1"
            );
        });
    });

    describe("clearExecutionMemory", () => {
        it("should clear memory for execution", async () => {
            // Set up mock return value using the shared instance
            mockThreadMemoryServiceInstance.clearExecutionMemory.mockResolvedValue(5);

            const result = await clearExecutionMemory({ executionId: "exec-1" });

            expect(result).toEqual({ deleted: 5 });
            expect(mockThreadMemoryServiceInstance.clearExecutionMemory).toHaveBeenCalledWith(
                "exec-1"
            );
        });
    });

    describe("createThreadMemoryTool", () => {
        it("should create thread memory search tool definition", () => {
            const tool = createThreadMemoryTool();

            expect(tool.id).toBe("built-in-search-thread-memory");
            expect(tool.name).toBe("search_thread_memory");
            expect(tool.type).toBe("function");
            expect(tool.schema.properties).toHaveProperty("query");
            expect(tool.schema.properties).toHaveProperty("topK");
            expect(tool.schema.properties).toHaveProperty("similarityThreshold");
            expect(tool.schema.properties).toHaveProperty("contextWindow");
            expect(tool.schema.required).toContain("query");
            expect(tool.config.functionName).toBe("search_thread_memory");
        });
    });

    describe("injectThreadMemoryTool", () => {
        it("should inject thread memory tool into tools list", () => {
            const existingTools: Tool[] = [
                {
                    id: "tool-1",
                    name: "other_tool",
                    type: "function",
                    description: "Other tool",
                    schema: {},
                    config: {}
                }
            ];

            const result = injectThreadMemoryTool(existingTools);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("search_thread_memory");
            expect(result[1].name).toBe("other_tool");
        });

        it("should not duplicate if tool already exists", () => {
            const existingTools: Tool[] = [
                {
                    id: "built-in-search-thread-memory",
                    name: "search_thread_memory",
                    type: "function",
                    description: "Search memory",
                    schema: {},
                    config: {}
                }
            ];

            const result = injectThreadMemoryTool(existingTools);

            expect(result).toHaveLength(1);
        });
    });

    describe("createWorkingMemoryTool", () => {
        it("should create working memory tool definition", () => {
            const tool = createWorkingMemoryTool();

            expect(tool.id).toBe("built-in-update-working-memory");
            expect(tool.name).toBe("update_working_memory");
            expect(tool.type).toBe("function");
            expect(tool.schema.properties).toHaveProperty("newMemory");
            expect(tool.schema.properties).toHaveProperty("searchString");
            expect(tool.schema.required).toContain("newMemory");
        });
    });

    describe("executeUpdateWorkingMemory", () => {
        it("should update working memory successfully", async () => {
            const mockWorkingMemoryService = {
                update: jest.fn().mockResolvedValue({
                    success: true,
                    reason: "appended",
                    workingMemory: "Previous memory. New memory."
                })
            };
            mockGetWorkingMemoryService.mockReturnValue(
                mockWorkingMemoryService as unknown as ReturnType<typeof getWorkingMemoryService>
            );

            const result = await executeUpdateWorkingMemory({
                agentId: "agent-1",
                userId: "user-1",
                newMemory: "New memory."
            });

            expect(result.success).toBe(true);
            expect(result.action).toBe("appended");
            expect(result.currentMemory).toBe("Previous memory. New memory.");
        });

        it("should handle duplicate memory", async () => {
            const mockWorkingMemoryService = {
                update: jest.fn().mockResolvedValue({
                    success: false,
                    reason: "duplicate"
                })
            };
            mockGetWorkingMemoryService.mockReturnValue(
                mockWorkingMemoryService as unknown as ReturnType<typeof getWorkingMemoryService>
            );

            const result = await executeUpdateWorkingMemory({
                agentId: "agent-1",
                userId: "user-1",
                newMemory: "Existing memory."
            });

            expect(result.success).toBe(false);
            expect(result.action).toBe("duplicate");
        });

        it("should handle errors gracefully", async () => {
            const mockWorkingMemoryService = {
                update: jest.fn().mockRejectedValue(new Error("Database error"))
            };
            mockGetWorkingMemoryService.mockReturnValue(
                mockWorkingMemoryService as unknown as ReturnType<typeof getWorkingMemoryService>
            );

            const result = await executeUpdateWorkingMemory({
                agentId: "agent-1",
                userId: "user-1",
                newMemory: "New memory."
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe(true);
            expect(result.message).toBe("Database error");
        });
    });

    describe("getWorkingMemoryForAgent", () => {
        it("should return working memory", async () => {
            const mockWorkingMemoryService = {
                get: jest.fn().mockResolvedValue("User prefers concise responses.")
            };
            mockGetWorkingMemoryService.mockReturnValue(
                mockWorkingMemoryService as unknown as ReturnType<typeof getWorkingMemoryService>
            );

            const result = await getWorkingMemoryForAgent("agent-1", "user-1");

            expect(result).toBe("User prefers concise responses.");
            expect(mockWorkingMemoryService.get).toHaveBeenCalledWith("agent-1", "user-1");
        });

        it("should return null when no working memory exists", async () => {
            const mockWorkingMemoryService = {
                get: jest.fn().mockResolvedValue(null)
            };
            mockGetWorkingMemoryService.mockReturnValue(
                mockWorkingMemoryService as unknown as ReturnType<typeof getWorkingMemoryService>
            );

            const result = await getWorkingMemoryForAgent("agent-1", "user-1");

            expect(result).toBeNull();
        });
    });

    describe("isWorkingMemoryEnabled", () => {
        it("should return true when enabled", () => {
            expect(isWorkingMemoryEnabled({ workingMemoryEnabled: true })).toBe(true);
        });

        it("should return false when disabled", () => {
            expect(isWorkingMemoryEnabled({ workingMemoryEnabled: false })).toBe(false);
        });

        it("should return false when not specified", () => {
            expect(isWorkingMemoryEnabled({})).toBe(false);
        });
    });

    describe("Shared Memory Tools", () => {
        describe("createReadSharedMemoryTool", () => {
            it("should create read shared memory tool", () => {
                const tool = createReadSharedMemoryTool();

                expect(tool.id).toBe("built-in-read-shared-memory");
                expect(tool.name).toBe("read_shared_memory");
                expect(tool.type).toBe("function");
                expect(tool.schema.properties).toHaveProperty("key");
                expect(tool.schema.required).toContain("key");
            });
        });

        describe("createWriteSharedMemoryTool", () => {
            it("should create write shared memory tool", () => {
                const tool = createWriteSharedMemoryTool();

                expect(tool.id).toBe("built-in-write-shared-memory");
                expect(tool.name).toBe("write_shared_memory");
                expect(tool.schema.properties).toHaveProperty("key");
                expect(tool.schema.properties).toHaveProperty("value");
                expect(tool.schema.properties).toHaveProperty("enableSemanticSearch");
                expect(tool.schema.required).toContain("key");
                expect(tool.schema.required).toContain("value");
            });
        });

        describe("createSearchSharedMemoryTool", () => {
            it("should create search shared memory tool", () => {
                const tool = createSearchSharedMemoryTool();

                expect(tool.id).toBe("built-in-search-shared-memory");
                expect(tool.name).toBe("search_shared_memory");
                expect(tool.schema.properties).toHaveProperty("query");
                expect(tool.schema.properties).toHaveProperty("topK");
                expect(tool.schema.properties).toHaveProperty("similarityThreshold");
                expect(tool.schema.required).toContain("query");
            });
        });

        describe("injectSharedMemoryTools", () => {
            it("should inject all three shared memory tools", () => {
                const existingTools: Tool[] = [
                    {
                        id: "tool-1",
                        name: "other_tool",
                        type: "function",
                        description: "Other",
                        schema: {},
                        config: {}
                    }
                ];

                const result = injectSharedMemoryTools(existingTools);

                expect(result).toHaveLength(4);
                expect(result.map((t) => t.name)).toContain("read_shared_memory");
                expect(result.map((t) => t.name)).toContain("write_shared_memory");
                expect(result.map((t) => t.name)).toContain("search_shared_memory");
            });

            it("should not duplicate existing shared memory tools", () => {
                const existingTools: Tool[] = [
                    {
                        id: "built-in-read-shared-memory",
                        name: "read_shared_memory",
                        type: "function",
                        description: "Read",
                        schema: {},
                        config: {}
                    }
                ];

                const result = injectSharedMemoryTools(existingTools);

                // Should only add 2 new tools (write and search)
                expect(result).toHaveLength(3);
            });
        });

        describe("isSharedMemoryTool", () => {
            it("should identify shared memory tools", () => {
                expect(isSharedMemoryTool("read_shared_memory")).toBe(true);
                expect(isSharedMemoryTool("write_shared_memory")).toBe(true);
                expect(isSharedMemoryTool("search_shared_memory")).toBe(true);
            });

            it("should return false for non-shared memory tools", () => {
                expect(isSharedMemoryTool("other_tool")).toBe(false);
                expect(isSharedMemoryTool("search_thread_memory")).toBe(false);
            });
        });
    });
});
