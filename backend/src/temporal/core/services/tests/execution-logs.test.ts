/**
 * Execution Logs Tests
 *
 * Tests for node execution logging and retrieval.
 */

import { db } from "../../../../storage/database";
import {
    NodeLogRepository,
    logNodeExecution,
    DEFAULT_NODE_LOGGING_CONFIG,
    type NodeLogEntry,
    type NodeLogQueryOptions,
    type NodeLoggingConfig
} from "../execution-logs";

// Mock database
jest.mock("../../../../storage/database", () => ({
    db: {
        query: jest.fn()
    }
}));

describe("Execution Logs", () => {
    const mockQuery = db.query as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("DEFAULT_NODE_LOGGING_CONFIG", () => {
        it("should have sensible defaults", () => {
            expect(DEFAULT_NODE_LOGGING_CONFIG.maxInputSizeBytes).toBe(10 * 1024);
            expect(DEFAULT_NODE_LOGGING_CONFIG.maxOutputSizeBytes).toBe(10 * 1024);
            expect(DEFAULT_NODE_LOGGING_CONFIG.logInputData).toBe(true);
            expect(DEFAULT_NODE_LOGGING_CONFIG.logOutputData).toBe(true);
            expect(DEFAULT_NODE_LOGGING_CONFIG.logTokenUsage).toBe(true);
            expect(DEFAULT_NODE_LOGGING_CONFIG.retentionDays).toBe(30);
        });
    });

    describe("NodeLogRepository", () => {
        let repository: NodeLogRepository;

        beforeEach(() => {
            repository = new NodeLogRepository();
        });

        describe("constructor", () => {
            it("should use default config when none provided", () => {
                const repo = new NodeLogRepository();
                expect(repo).toBeDefined();
            });

            it("should merge custom config with defaults", () => {
                const customConfig: Partial<NodeLoggingConfig> = {
                    maxInputSizeBytes: 5 * 1024,
                    retentionDays: 7
                };
                const repo = new NodeLogRepository(customConfig);
                expect(repo).toBeDefined();
            });
        });

        describe("logStart", () => {
            it("should insert a new log entry", async () => {
                mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

                const id = await repository.logStart({
                    executionId: "exec-123",
                    nodeId: "node-456",
                    nodeType: "llm",
                    nodeName: "Generate Text"
                });

                expect(id).toBe(1);
                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("INSERT INTO flowmaestro.execution_logs"),
                    expect.arrayContaining(["exec-123", "node-456", "llm", "Generate Text"])
                );
            });

            it("should include input data when configured", async () => {
                mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

                await repository.logStart({
                    executionId: "exec-123",
                    nodeId: "node-456",
                    nodeType: "llm",
                    inputData: { prompt: "Hello" }
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.arrayContaining([expect.stringContaining("prompt")])
                );
            });

            it("should include attempt number", async () => {
                mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

                await repository.logStart({
                    executionId: "exec-123",
                    nodeId: "node-456",
                    nodeType: "llm",
                    attemptNumber: 2
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.arrayContaining([2])
                );
            });

            it("should default attempt number to 1", async () => {
                mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

                await repository.logStart({
                    executionId: "exec-123",
                    nodeId: "node-456",
                    nodeType: "llm"
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.arrayContaining([1])
                );
            });

            it("should not log input data when disabled", async () => {
                const repo = new NodeLogRepository({ logInputData: false });
                mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

                await repo.logStart({
                    executionId: "exec-123",
                    nodeId: "node-456",
                    nodeType: "llm",
                    inputData: { prompt: "Hello" }
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.arrayContaining([null]) // Input data should be null
                );
            });
        });

        describe("logComplete", () => {
            it("should update log entry with completed status", async () => {
                mockQuery.mockResolvedValue({ rowCount: 1 });

                await repository.logComplete(1, {
                    outputData: { result: "success" }
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("status = 'completed'"),
                    expect.arrayContaining([1])
                );
            });

            it("should include output data", async () => {
                mockQuery.mockResolvedValue({ rowCount: 1 });

                await repository.logComplete(1, {
                    outputData: { result: "success" }
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.arrayContaining([expect.stringContaining("result")])
                );
            });

            it("should include token usage", async () => {
                mockQuery.mockResolvedValue({ rowCount: 1 });

                await repository.logComplete(1, {
                    tokenUsage: {
                        promptTokens: 100,
                        completionTokens: 50,
                        totalTokens: 150
                    }
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.arrayContaining([expect.stringContaining("totalTokens")])
                );
            });

            it("should not log output data when disabled", async () => {
                const repo = new NodeLogRepository({ logOutputData: false });
                mockQuery.mockResolvedValue({ rowCount: 1 });

                await repo.logComplete(1, {
                    outputData: { result: "success" }
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.arrayContaining([1, null, expect.anything()])
                );
            });
        });

        describe("logFailed", () => {
            it("should update log entry with failed status", async () => {
                mockQuery.mockResolvedValue({ rowCount: 1 });

                await repository.logFailed(1, {
                    message: "API rate limit exceeded"
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("status = 'failed'"),
                    expect.arrayContaining([1, expect.anything(), "API rate limit exceeded"])
                );
            });

            it("should include output data on failure", async () => {
                mockQuery.mockResolvedValue({ rowCount: 1 });

                await repository.logFailed(1, {
                    message: "Error",
                    outputData: { partialResult: "data" }
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.arrayContaining([expect.stringContaining("partialResult")])
                );
            });
        });

        describe("logSkipped", () => {
            it("should insert a skipped log entry", async () => {
                mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

                const id = await repository.logSkipped({
                    executionId: "exec-123",
                    nodeId: "node-456",
                    nodeType: "conditional",
                    nodeName: "Branch Check",
                    reason: "Condition evaluated to false"
                });

                expect(id).toBe(1);
                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("status, error_message"),
                    expect.arrayContaining([
                        "exec-123",
                        "node-456",
                        "conditional",
                        "Branch Check",
                        "Condition evaluated to false"
                    ])
                );
            });

            it("should use default reason when not provided", async () => {
                mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

                await repository.logSkipped({
                    executionId: "exec-123",
                    nodeId: "node-456",
                    nodeType: "conditional"
                });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.arrayContaining(["Node skipped due to branch condition"])
                );
            });
        });

        describe("findById", () => {
            it("should return log entry by ID", async () => {
                mockQuery.mockResolvedValue({
                    rows: [
                        {
                            id: 1,
                            execution_id: "exec-123",
                            node_id: "node-456",
                            node_type: "llm",
                            node_name: "Test Node",
                            started_at: new Date(),
                            completed_at: new Date(),
                            duration_ms: 100,
                            status: "completed",
                            input_data: '{"prompt":"test"}',
                            output_data: '{"result":"success"}',
                            error_message: null,
                            token_usage: '{"totalTokens":100}',
                            attempt_number: 1,
                            created_at: new Date()
                        }
                    ]
                });

                const entry = await repository.findById(1);

                expect(entry).not.toBeNull();
                expect(entry?.executionId).toBe("exec-123");
                expect(entry?.nodeType).toBe("llm");
                expect(entry?.inputData).toEqual({ prompt: "test" });
                expect(entry?.tokenUsage).toEqual({ totalTokens: 100 });
            });

            it("should return null if not found", async () => {
                mockQuery.mockResolvedValue({ rows: [] });

                const entry = await repository.findById(999);

                expect(entry).toBeNull();
            });
        });

        describe("findByExecutionId", () => {
            it("should find all logs for execution", async () => {
                mockQuery.mockResolvedValue({
                    rows: [
                        {
                            id: 1,
                            execution_id: "exec-123",
                            node_id: "node-1",
                            node_type: "input",
                            node_name: null,
                            started_at: new Date(),
                            completed_at: new Date(),
                            duration_ms: 10,
                            status: "completed",
                            input_data: null,
                            output_data: null,
                            error_message: null,
                            token_usage: null,
                            attempt_number: 1,
                            created_at: new Date()
                        },
                        {
                            id: 2,
                            execution_id: "exec-123",
                            node_id: "node-2",
                            node_type: "llm",
                            node_name: null,
                            started_at: new Date(),
                            completed_at: new Date(),
                            duration_ms: 1000,
                            status: "completed",
                            input_data: null,
                            output_data: null,
                            error_message: null,
                            token_usage: null,
                            attempt_number: 1,
                            created_at: new Date()
                        }
                    ]
                });

                const entries = await repository.findByExecutionId("exec-123");

                expect(entries).toHaveLength(2);
            });
        });

        describe("query", () => {
            it("should build query with execution ID filter", async () => {
                mockQuery.mockResolvedValue({ rows: [] });

                await repository.query({ executionId: "exec-123" });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("execution_id = $1"),
                    expect.arrayContaining(["exec-123"])
                );
            });

            it("should build query with node type filter", async () => {
                mockQuery.mockResolvedValue({ rows: [] });

                await repository.query({ nodeType: "llm" });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("node_type = $1"),
                    expect.arrayContaining(["llm"])
                );
            });

            it("should build query with status filter", async () => {
                mockQuery.mockResolvedValue({ rows: [] });

                await repository.query({ status: "failed" });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("status = $1"),
                    expect.arrayContaining(["failed"])
                );
            });

            it("should build query with min duration filter", async () => {
                mockQuery.mockResolvedValue({ rows: [] });

                await repository.query({ minDurationMs: 1000 });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("duration_ms >= $1"),
                    expect.arrayContaining([1000])
                );
            });

            it("should build query with hasError filter", async () => {
                mockQuery.mockResolvedValue({ rows: [] });

                await repository.query({ hasError: true });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("error_message IS NOT NULL"),
                    expect.any(Array)
                );
            });

            it("should build query with hasTokenUsage filter", async () => {
                mockQuery.mockResolvedValue({ rows: [] });

                await repository.query({ hasTokenUsage: true });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("token_usage IS NOT NULL"),
                    expect.any(Array)
                );
            });

            it("should apply ordering", async () => {
                mockQuery.mockResolvedValue({ rows: [] });

                await repository.query({ orderBy: "duration_ms", orderDir: "desc" });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("ORDER BY duration_ms desc"),
                    expect.any(Array)
                );
            });

            it("should apply limit and offset", async () => {
                mockQuery.mockResolvedValue({ rows: [] });

                await repository.query({ limit: 10, offset: 20 });

                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringMatching(/LIMIT \$\d+.*OFFSET \$\d+/),
                    expect.arrayContaining([10, 20])
                );
            });

            it("should combine multiple filters", async () => {
                mockQuery.mockResolvedValue({ rows: [] });

                const options: NodeLogQueryOptions = {
                    executionId: "exec-123",
                    nodeType: "llm",
                    status: "completed",
                    minDurationMs: 500,
                    limit: 10
                };

                await repository.query(options);

                const [query, values] = mockQuery.mock.calls[0];
                expect(query).toContain("execution_id");
                expect(query).toContain("node_type");
                expect(query).toContain("status");
                expect(query).toContain("duration_ms");
                expect(query).toContain("LIMIT");
                expect(values).toContain("exec-123");
                expect(values).toContain("llm");
                expect(values).toContain("completed");
                expect(values).toContain(500);
                expect(values).toContain(10);
            });
        });

        describe("getSummary", () => {
            it("should return execution summary", async () => {
                mockQuery
                    .mockResolvedValueOnce({
                        rows: [
                            {
                                total: "5",
                                completed: "3",
                                failed: "1",
                                skipped: "1",
                                total_duration: "5000",
                                avg_duration: "1000",
                                total_tokens: "500",
                                total_cost: "0.05"
                            }
                        ]
                    })
                    .mockResolvedValueOnce({
                        rows: [
                            {
                                node_type: "llm",
                                count: "2",
                                total_duration: "4000",
                                total_tokens: "500"
                            },
                            {
                                node_type: "input",
                                count: "1",
                                total_duration: "100",
                                total_tokens: "0"
                            }
                        ]
                    });

                const summary = await repository.getSummary("exec-123");

                expect(summary.totalNodes).toBe(5);
                expect(summary.completedNodes).toBe(3);
                expect(summary.failedNodes).toBe(1);
                expect(summary.skippedNodes).toBe(1);
                expect(summary.totalDurationMs).toBe(5000);
                expect(summary.avgDurationMs).toBe(1000);
                expect(summary.totalTokens).toBe(500);
                expect(summary.totalCostUsd).toBe(0.05);
                expect(summary.byNodeType).toEqual({
                    llm: { count: 2, totalDurationMs: 4000, totalTokens: 500 },
                    input: { count: 1, totalDurationMs: 100, totalTokens: 0 }
                });
            });
        });

        describe("deleteByExecutionId", () => {
            it("should delete all logs for execution", async () => {
                mockQuery.mockResolvedValue({ rowCount: 5 });

                const count = await repository.deleteByExecutionId("exec-123");

                expect(count).toBe(5);
                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("DELETE FROM flowmaestro.execution_logs"),
                    ["exec-123"]
                );
            });

            it("should return 0 if no rows deleted", async () => {
                mockQuery.mockResolvedValue({ rowCount: 0 });

                const count = await repository.deleteByExecutionId("exec-nonexistent");

                expect(count).toBe(0);
            });
        });

        describe("deleteOldLogs", () => {
            it("should delete logs older than retention period", async () => {
                mockQuery.mockResolvedValue({ rowCount: 100 });

                const count = await repository.deleteOldLogs(30);

                expect(count).toBe(100);
                expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("30 days"));
            });

            it("should use default retention from config", async () => {
                mockQuery.mockResolvedValue({ rowCount: 50 });

                const count = await repository.deleteOldLogs();

                expect(count).toBe(50);
                expect(mockQuery).toHaveBeenCalledWith(
                    expect.stringContaining("30 days") // Default retention
                );
            });

            it("should return 0 if retention is 0 or negative", async () => {
                const repo = new NodeLogRepository({ retentionDays: 0 });

                const count = await repo.deleteOldLogs();

                expect(count).toBe(0);
                expect(mockQuery).not.toHaveBeenCalled();
            });
        });

        describe("truncateJson", () => {
            it("should truncate large JSON data", async () => {
                mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

                // Create large input data
                const largeData = { data: "x".repeat(50000) };

                await repository.logStart({
                    executionId: "exec-123",
                    nodeId: "node-456",
                    nodeType: "llm",
                    inputData: largeData
                });

                const [, values] = mockQuery.mock.calls[0];
                const inputJson = values[4];

                // Should be truncated
                expect(inputJson).toContain("__truncated");
                expect(inputJson).toContain("__originalLength");
                expect(inputJson).toContain("__preview");
            });

            it("should not truncate small JSON data", async () => {
                mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

                const smallData = { prompt: "Hello" };

                await repository.logStart({
                    executionId: "exec-123",
                    nodeId: "node-456",
                    nodeType: "llm",
                    inputData: smallData
                });

                const [, values] = mockQuery.mock.calls[0];
                const inputJson = values[4];

                // Should not be truncated
                expect(inputJson).not.toContain("__truncated");
                expect(JSON.parse(inputJson)).toEqual(smallData);
            });
        });
    });

    describe("logNodeExecution", () => {
        it("should log started entry", async () => {
            mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

            const entry: NodeLogEntry = {
                executionId: "exec-123",
                nodeId: "node-456",
                nodeType: "llm",
                nodeName: "Test Node",
                startedAt: new Date(),
                status: "started"
            };

            const id = await logNodeExecution(entry);

            expect(id).toBe(1);
            expect(mockQuery).toHaveBeenCalledTimes(1);
        });

        it("should log and complete entry", async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rowCount: 1 });

            const entry: NodeLogEntry = {
                executionId: "exec-123",
                nodeId: "node-456",
                nodeType: "llm",
                nodeName: "Test Node",
                startedAt: new Date(),
                status: "completed",
                outputData: { result: "success" },
                tokenUsage: { totalTokens: 100 }
            };

            await logNodeExecution(entry);

            expect(mockQuery).toHaveBeenCalledTimes(2);
        });

        it("should log and fail entry", async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rowCount: 1 });

            const entry: NodeLogEntry = {
                executionId: "exec-123",
                nodeId: "node-456",
                nodeType: "llm",
                nodeName: "Test Node",
                startedAt: new Date(),
                status: "failed",
                errorMessage: "API error"
            };

            await logNodeExecution(entry);

            expect(mockQuery).toHaveBeenCalledTimes(2);
            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("status = 'failed'"),
                expect.any(Array)
            );
        });

        it("should use default error message for failed entries", async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rowCount: 1 });

            const entry: NodeLogEntry = {
                executionId: "exec-123",
                nodeId: "node-456",
                nodeType: "llm",
                startedAt: new Date(),
                status: "failed"
            };

            await logNodeExecution(entry);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.any(String),
                expect.arrayContaining(["Unknown error"])
            );
        });
    });

    describe("NodeLogEntry interface", () => {
        it("should allow all optional fields", () => {
            const entry: NodeLogEntry = {
                executionId: "exec-123",
                nodeId: "node-456",
                nodeType: "llm",
                startedAt: new Date(),
                status: "started"
            };

            expect(entry.nodeName).toBeUndefined();
            expect(entry.completedAt).toBeUndefined();
            expect(entry.durationMs).toBeUndefined();
            expect(entry.inputData).toBeUndefined();
            expect(entry.outputData).toBeUndefined();
            expect(entry.errorMessage).toBeUndefined();
            expect(entry.tokenUsage).toBeUndefined();
        });

        it("should allow all defined fields", () => {
            const entry: NodeLogEntry = {
                id: 1,
                executionId: "exec-123",
                nodeId: "node-456",
                nodeType: "llm",
                nodeName: "Test Node",
                startedAt: new Date(),
                completedAt: new Date(),
                durationMs: 1000,
                status: "completed",
                inputData: { prompt: "test" },
                outputData: { result: "success" },
                errorMessage: undefined,
                tokenUsage: {
                    promptTokens: 50,
                    completionTokens: 50,
                    totalTokens: 100,
                    model: "gpt-4",
                    provider: "openai",
                    costUsd: 0.01
                },
                attemptNumber: 1,
                createdAt: new Date()
            };

            expect(entry).toBeDefined();
        });
    });
});
