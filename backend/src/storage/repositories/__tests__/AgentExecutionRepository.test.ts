/**
 * AgentExecutionRepository Tests
 *
 * Tests for agent execution CRUD operations including message handling,
 * thread persistence, and status management.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { AgentExecutionRepository } from "../AgentExecutionRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateAgentExecutionRow,
    generateAgentMessageRow,
    generateId
} from "./setup";

describe("AgentExecutionRepository", () => {
    let repository: AgentExecutionRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new AgentExecutionRepository();
    });

    describe("create", () => {
        it("should insert a new agent execution", async () => {
            const input = {
                agent_id: generateId(),
                user_id: generateId(),
                thread_id: generateId()
            };

            const mockRow = generateAgentExecutionRow({
                agent_id: input.agent_id,
                user_id: input.user_id,
                thread_id: input.thread_id,
                status: "running"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.agent_executions"),
                expect.arrayContaining([input.agent_id, input.user_id, input.thread_id, "running"])
            );
            expect(result.agent_id).toBe(input.agent_id);
            expect(result.status).toBe("running");
        });

        it("should use default values when not specified", async () => {
            const input = {
                agent_id: generateId(),
                user_id: generateId(),
                thread_id: generateId()
            };

            const mockRow = generateAgentExecutionRow({
                ...input,
                thread_history: "[]",
                iterations: 0,
                tool_calls_count: 0,
                metadata: "{}"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.thread_history).toEqual([]);
            expect(result.iterations).toBe(0);
            expect(result.tool_calls_count).toBe(0);
        });

        it("should stringify JSON fields", async () => {
            const threadHistory = [
                { id: "msg-1", timestamp: new Date(), role: "user" as const, content: "Hello" }
            ];
            const metadata = { source: "api" };
            const input = {
                agent_id: generateId(),
                user_id: generateId(),
                thread_id: generateId(),
                thread_history: threadHistory,
                metadata: metadata
            };

            const mockRow = generateAgentExecutionRow({
                ...input,
                thread_history: JSON.stringify(threadHistory),
                metadata: JSON.stringify(metadata)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(threadHistory), JSON.stringify(metadata)])
            );
        });
    });

    describe("findById", () => {
        it("should return execution when found", async () => {
            const executionId = generateId();
            const mockRow = generateAgentExecutionRow({ id: executionId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(executionId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                executionId
            ]);
            expect(result?.id).toBe(executionId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });

        it("should parse JSON fields from string", async () => {
            const executionId = generateId();
            const timestamp = new Date();
            const threadHistory = [
                { id: "msg-1", timestamp, role: "user" as const, content: "Test" }
            ];
            const metadata = { test: true };
            const mockRow = generateAgentExecutionRow({
                id: executionId,
                thread_history: JSON.stringify(threadHistory),
                metadata: JSON.stringify(metadata)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(executionId);

            // JSON.parse converts Date to ISO string
            expect(result?.thread_history).toEqual([
                { id: "msg-1", timestamp: timestamp.toISOString(), role: "user", content: "Test" }
            ]);
            expect(result?.metadata).toEqual(metadata);
        });
    });

    describe("findByIdAndUserId", () => {
        it("should find execution by id and user id", async () => {
            const executionId = generateId();
            const userId = generateId();
            const mockRow = generateAgentExecutionRow({ id: executionId, user_id: userId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndUserId(executionId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND user_id = $2"),
                [executionId, userId]
            );
            expect(result?.id).toBe(executionId);
        });
    });

    describe("findByAgentId", () => {
        it("should return paginated executions with total count", async () => {
            const agentId = generateId();
            const mockExecutions = [
                generateAgentExecutionRow({ agent_id: agentId }),
                generateAgentExecutionRow({ agent_id: agentId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockExecutions));

            const result = await repository.findByAgentId(agentId, { limit: 2, offset: 0 });

            expect(result.total).toBe(10);
            expect(result.executions).toHaveLength(2);
        });

        it("should filter by status when provided", async () => {
            const agentId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateAgentExecutionRow()]));

            await repository.findByAgentId(agentId, { status: "completed" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("status = $2"),
                expect.arrayContaining([agentId, "completed"])
            );
        });

        it("should use default pagination values", async () => {
            const agentId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(0)).mockResolvedValueOnce(mockRows([]));

            await repository.findByAgentId(agentId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT"),
                expect.arrayContaining([agentId, 50, 0])
            );
        });
    });

    describe("findByUserId", () => {
        it("should return paginated executions for user", async () => {
            const userId = generateId();
            const mockExecutions = [generateAgentExecutionRow({ user_id: userId })];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(1))
                .mockResolvedValueOnce(mockRows(mockExecutions));

            const result = await repository.findByUserId(userId, { limit: 10, offset: 0 });

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1"), [
                userId
            ]);
            expect(result.total).toBe(1);
            expect(result.executions).toHaveLength(1);
        });
    });

    describe("update", () => {
        it("should update specified fields", async () => {
            const executionId = generateId();
            const mockRow = generateAgentExecutionRow({ id: executionId, status: "completed" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(executionId, { status: "completed" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.agent_executions"),
                expect.arrayContaining(["completed", executionId])
            );
            expect(result?.status).toBe("completed");
        });

        it("should stringify JSON fields when updating", async () => {
            const executionId = generateId();
            const threadHistory = [
                {
                    id: "msg-1",
                    timestamp: new Date(),
                    role: "assistant" as const,
                    content: "Response"
                }
            ];
            const metadata = { updated: true };
            const mockRow = generateAgentExecutionRow({ id: executionId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(executionId, {
                thread_history: threadHistory,
                metadata: metadata
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    JSON.stringify(threadHistory),
                    JSON.stringify(metadata),
                    executionId
                ])
            );
        });

        it("should return existing execution when no updates provided", async () => {
            const executionId = generateId();
            const mockRow = generateAgentExecutionRow({ id: executionId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(executionId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.agent_executions"),
                [executionId]
            );
            expect(result?.id).toBe(executionId);
        });

        it("should update counters and timestamps", async () => {
            const executionId = generateId();
            const completedAt = new Date();
            const mockRow = generateAgentExecutionRow({ id: executionId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(executionId, {
                iterations: 5,
                tool_calls_count: 3,
                completed_at: completedAt,
                error: "Test error"
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([5, 3, completedAt, "Test error", executionId])
            );
        });
    });

    describe("addMessage", () => {
        it("should add a user message", async () => {
            const input = {
                execution_id: generateId(),
                role: "user" as const,
                content: "Hello, agent!"
            };

            const mockRow = generateAgentMessageRow({
                execution_id: input.execution_id,
                role: input.role,
                content: input.content
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.addMessage(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.agent_messages"),
                expect.arrayContaining([input.execution_id, input.role, input.content])
            );
            expect(result.content).toBe(input.content);
        });

        it("should add a tool call message", async () => {
            const toolCalls = [{ id: "call-1", name: "search", arguments: { query: "test" } }];
            const input = {
                execution_id: generateId(),
                role: "assistant" as const,
                content: "Let me search for that.",
                tool_calls: toolCalls,
                tool_name: "search",
                tool_call_id: "call_123"
            };

            const mockRow = generateAgentMessageRow({
                ...input,
                tool_calls: JSON.stringify(toolCalls)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.addMessage(input);

            expect(result.tool_name).toBe("search");
            expect(result.tool_call_id).toBe("call_123");
        });
    });

    describe("getMessages", () => {
        it("should return messages for execution", async () => {
            const executionId = generateId();
            const mockMessages = [
                generateAgentMessageRow({ execution_id: executionId, role: "user" }),
                generateAgentMessageRow({ execution_id: executionId, role: "assistant" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockMessages));

            const result = await repository.getMessages(executionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE execution_id = $1"),
                expect.arrayContaining([executionId])
            );
            expect(result).toHaveLength(2);
        });

        it("should order by created_at ascending", async () => {
            const executionId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.getMessages(executionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at ASC"),
                expect.anything()
            );
        });
    });

    describe("getMessagesByThread", () => {
        it("should return messages for thread", async () => {
            const threadId = generateId();
            const mockMessages = [
                generateAgentMessageRow({ thread_id: threadId }),
                generateAgentMessageRow({ thread_id: threadId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockMessages));

            const result = await repository.getMessagesByThread(threadId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE thread_id = $1"),
                expect.arrayContaining([threadId])
            );
            expect(result).toHaveLength(2);
        });
    });

    describe("deleteExecution", () => {
        it("should hard delete execution and return true", async () => {
            const executionId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.deleteExecution(executionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.agent_executions"),
                [executionId]
            );
            expect(result).toBe(true);
        });

        it("should return false when execution not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteExecution("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("saveMessagesToThread", () => {
        it("should batch insert messages to thread", async () => {
            const threadId = generateId();
            const executionId = generateId();
            const messages = [
                { id: "msg1", role: "user", content: "Hello" },
                { id: "msg2", role: "assistant", content: "Hi there!" }
            ];

            mockQuery.mockResolvedValueOnce(mockAffectedRows(2));

            await repository.saveMessagesToThread(threadId, executionId, messages);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.agent_messages"),
                expect.arrayContaining([threadId, executionId, "user", "Hello"])
            );
        });

        it("should do nothing when messages array is empty", async () => {
            const threadId = generateId();
            const executionId = generateId();

            await repository.saveMessagesToThread(threadId, executionId, []);

            expect(mockQuery).not.toHaveBeenCalled();
        });

        it("should handle tool calls in messages", async () => {
            const threadId = generateId();
            const executionId = generateId();
            const toolCalls = [{ name: "test", arguments: {} }];
            const messages = [
                {
                    id: "msg1",
                    role: "assistant",
                    content: "Using tool",
                    tool_calls: toolCalls,
                    tool_name: "test",
                    tool_call_id: "call_1"
                }
            ];

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.saveMessagesToThread(threadId, executionId, messages);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(toolCalls), "test", "call_1"])
            );
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const executionId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateAgentExecutionRow({
                id: executionId,
                started_at: now,
                completed_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(executionId);

            expect(result?.started_at).toBeInstanceOf(Date);
            expect(result?.completed_at).toBeInstanceOf(Date);
        });

        it("should handle null completed_at", async () => {
            const executionId = generateId();
            const mockRow = generateAgentExecutionRow({
                id: executionId,
                completed_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(executionId);

            expect(result?.completed_at).toBeNull();
        });

        it("should handle JSON fields already parsed by pg", async () => {
            const executionId = generateId();
            const threadHistory = [{ role: "user", content: "Test" }];
            const metadata = { key: "value" };
            const mockRow = {
                ...generateAgentExecutionRow({ id: executionId }),
                thread_history: threadHistory, // Already an array
                metadata: metadata // Already an object
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(executionId);

            expect(result?.thread_history).toEqual(threadHistory);
            expect(result?.metadata).toEqual(metadata);
        });
    });
});
