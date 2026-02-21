/**
 * ExecutionRepository Tests
 *
 * Tests for execution CRUD operations including status filtering,
 * logs querying, and JSON field handling.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { ExecutionRepository } from "../ExecutionRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateExecutionRow,
    generateId
} from "./setup";

describe("ExecutionRepository", () => {
    let repository: ExecutionRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ExecutionRepository();
    });

    describe("create", () => {
        it("should insert a new execution with pending status", async () => {
            const workflowId = generateId();
            const inputs = { key: "value" };

            const mockRow = generateExecutionRow({
                workflow_id: workflowId,
                status: "pending",
                context: JSON.stringify(inputs)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create({
                workflow_id: workflowId,
                inputs
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.executions"),
                expect.arrayContaining([workflowId, JSON.stringify(inputs), "pending"])
            );
            expect(result.workflow_id).toBe(workflowId);
            expect(result.status).toBe("pending");
        });

        it("should handle null inputs", async () => {
            const workflowId = generateId();

            const mockRow = generateExecutionRow({
                workflow_id: workflowId,
                status: "pending"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create({ workflow_id: workflowId });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([workflowId, null, "pending"])
            );
            expect(result.inputs).toBeNull();
        });
    });

    describe("findById", () => {
        it("should return execution when found", async () => {
            const executionId = generateId();
            const mockRow = generateExecutionRow({ id: executionId });

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

        it("should parse JSON fields from strings", async () => {
            const executionId = generateId();
            const inputs = { input: "data" };
            const outputs = { result: "success" };
            const currentState = { step: 2 };
            const pauseContext = { node_id: "node-1", reason: "user_input" };

            const mockRow = generateExecutionRow({
                id: executionId,
                context: JSON.stringify(inputs)
            });
            (mockRow as unknown as { inputs: string }).inputs = JSON.stringify(inputs);
            (mockRow as unknown as { outputs: string }).outputs = JSON.stringify(outputs);
            (mockRow as unknown as { current_state: string }).current_state =
                JSON.stringify(currentState);
            (mockRow as unknown as { pause_context: string }).pause_context =
                JSON.stringify(pauseContext);

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(executionId);

            expect(result?.inputs).toEqual(inputs);
            expect(result?.outputs).toEqual(outputs);
            expect(result?.current_state).toEqual(currentState);
            expect(result?.pause_context).toEqual(pauseContext);
        });
    });

    describe("findByWorkflowId", () => {
        it("should return paginated executions with total count", async () => {
            const workflowId = generateId();
            const mockExecutions = [generateExecutionRow(), generateExecutionRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockExecutions));

            const result = await repository.findByWorkflowId(workflowId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.executions).toHaveLength(2);
        });

        it("should use default pagination values", async () => {
            const workflowId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(0)).mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkflowId(workflowId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT $2 OFFSET $3"),
                expect.arrayContaining([workflowId, 50, 0])
            );
        });
    });

    describe("findByStatus", () => {
        it("should return executions with specified status", async () => {
            const mockExecutions = [
                generateExecutionRow({ status: "running" }),
                generateExecutionRow({ status: "running" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockExecutions));

            const result = await repository.findByStatus("running");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE status = $1"),
                expect.arrayContaining(["running"])
            );
            expect(result).toHaveLength(2);
        });
    });

    describe("findAll", () => {
        it("should return all executions with pagination", async () => {
            const mockExecutions = [generateExecutionRow(), generateExecutionRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(100))
                .mockResolvedValueOnce(mockRows(mockExecutions));

            const result = await repository.findAll({ limit: 2, offset: 0 });

            expect(result.total).toBe(100);
            expect(result.executions).toHaveLength(2);
        });

        it("should filter by status when provided", async () => {
            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateExecutionRow()]));

            await repository.findAll({ status: "completed" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND status = $1"),
                expect.arrayContaining(["completed"])
            );
        });
    });

    describe("update", () => {
        it("should update specified fields", async () => {
            const executionId = generateId();
            const mockRow = generateExecutionRow({ id: executionId, status: "running" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(executionId, { status: "running" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.executions"),
                expect.arrayContaining(["running", executionId])
            );
            expect(result?.status).toBe("running");
        });

        it("should stringify JSON fields when updating", async () => {
            const executionId = generateId();
            const outputs = { result: "data" };
            const currentState = { step: 3 };
            const mockRow = generateExecutionRow({ id: executionId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(executionId, {
                outputs,
                current_state: currentState
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([
                    JSON.stringify(outputs),
                    JSON.stringify(currentState),
                    executionId
                ])
            );
        });

        it("should handle pause_context as null", async () => {
            const executionId = generateId();
            const mockRow = generateExecutionRow({ id: executionId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(executionId, { pause_context: null });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("pause_context = $1"),
                expect.arrayContaining([null, executionId])
            );
        });

        it("should return existing execution when no updates provided", async () => {
            const executionId = generateId();
            const mockRow = generateExecutionRow({ id: executionId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(executionId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.executions"),
                [executionId]
            );
            expect(result?.id).toBe(executionId);
        });

        it("should update timestamps", async () => {
            const executionId = generateId();
            const startedAt = new Date();
            const completedAt = new Date();
            const mockRow = generateExecutionRow({ id: executionId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(executionId, {
                started_at: startedAt,
                completed_at: completedAt
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("started_at = $1"),
                expect.arrayContaining([startedAt, completedAt, executionId])
            );
        });
    });

    describe("delete", () => {
        it("should soft delete execution and return true", async () => {
            const executionId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(executionId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.executions"),
                [executionId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET deleted_at = CURRENT_TIMESTAMP"),
                [executionId]
            );
            expect(result).toBe(true);
        });

        it("should return false when execution not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("getLogs", () => {
        it("should return paginated logs with total count", async () => {
            const executionId = generateId();
            const now = new Date().toISOString();
            const mockLogs = [
                { id: "log-1", message: "Log 1", created_at: now },
                { id: "log-2", message: "Log 2", created_at: now }
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(50))
                .mockResolvedValueOnce(mockRows(mockLogs));

            const result = await repository.getLogs(executionId, { limit: 2, offset: 0 });

            expect(result.total).toBe(50);
            expect(result.logs).toHaveLength(2);
        });

        it("should filter logs by level", async () => {
            const executionId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows([]));

            await repository.getLogs(executionId, { level: "error" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND level = $2"),
                expect.arrayContaining([executionId, "error"])
            );
        });

        it("should filter logs by nodeId", async () => {
            const executionId = generateId();
            const nodeId = "node-123";

            mockQuery.mockResolvedValueOnce(mockCountResult(5)).mockResolvedValueOnce(mockRows([]));

            await repository.getLogs(executionId, { nodeId });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND node_id = $2"),
                expect.arrayContaining([executionId, nodeId])
            );
        });

        it("should filter by both level and nodeId", async () => {
            const executionId = generateId();
            const nodeId = "node-456";

            mockQuery.mockResolvedValueOnce(mockCountResult(3)).mockResolvedValueOnce(mockRows([]));

            await repository.getLogs(executionId, { level: "warn", nodeId });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND level = $2"),
                expect.arrayContaining([executionId, "warn", nodeId])
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND node_id = $3"),
                expect.arrayContaining([executionId, "warn", nodeId])
            );
        });

        it("should parse JSON metadata in logs", async () => {
            const executionId = generateId();
            const metadata = { extra: "data" };
            const now = new Date().toISOString();

            mockQuery.mockResolvedValueOnce(mockCountResult(1)).mockResolvedValueOnce(
                mockRows([
                    {
                        id: "log-1",
                        message: "Log with metadata",
                        metadata: JSON.stringify(metadata),
                        created_at: now
                    }
                ])
            );

            const result = await repository.getLogs(executionId);

            expect((result.logs[0] as { metadata: Record<string, unknown> }).metadata).toEqual(
                metadata
            );
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const executionId = generateId();
            const now = new Date().toISOString();
            const mockRow = {
                ...generateExecutionRow({ id: executionId }),
                started_at: now,
                completed_at: now,
                created_at: now
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(executionId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.started_at).toBeInstanceOf(Date);
            expect(result?.completed_at).toBeInstanceOf(Date);
        });

        it("should handle null date fields", async () => {
            const executionId = generateId();
            const mockRow = generateExecutionRow({
                id: executionId,
                started_at: null,
                completed_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(executionId);

            expect(result?.started_at).toBeNull();
            expect(result?.completed_at).toBeNull();
        });

        it("should handle JSON fields already parsed by pg", async () => {
            const executionId = generateId();
            const inputs = { key: "value" };
            const mockRow = {
                ...generateExecutionRow({ id: executionId }),
                inputs // Already an object, not a string
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(executionId);

            expect(result?.inputs).toEqual(inputs);
        });
    });
});
