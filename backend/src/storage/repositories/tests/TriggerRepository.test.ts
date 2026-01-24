/**
 * TriggerRepository Tests
 *
 * Tests for trigger CRUD operations including webhook triggers,
 * schedule triggers, trigger executions, and webhook logs.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { TriggerRepository } from "../TriggerRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateTriggerRow,
    generateTriggerExecutionRow,
    generateWebhookLogRow,
    generateId
} from "./setup";

describe("TriggerRepository", () => {
    let repository: TriggerRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new TriggerRepository();
    });

    describe("create", () => {
        it("should insert a new webhook trigger with generated secret", async () => {
            const workflowId = generateId();
            const input = {
                workflow_id: workflowId,
                name: "My Webhook",
                trigger_type: "webhook" as const,
                config: { method: "POST" as const }
            };

            const mockRow = generateTriggerRow({
                workflow_id: workflowId,
                name: input.name,
                trigger_type: "webhook",
                config: JSON.stringify(input.config)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.workflow_triggers"),
                expect.arrayContaining([workflowId, input.name, "webhook"])
            );
            expect(result.workflow_id).toBe(workflowId);
            expect(result.trigger_type).toBe("webhook");
        });

        it("should create schedule trigger without webhook secret", async () => {
            const workflowId = generateId();
            const input = {
                workflow_id: workflowId,
                name: "Daily Schedule",
                trigger_type: "schedule" as const,
                config: { cronExpression: "0 9 * * *" }
            };

            const mockRow = generateTriggerRow({
                workflow_id: workflowId,
                name: input.name,
                trigger_type: "schedule",
                webhook_secret: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.webhook_secret).toBeNull();
        });

        it("should use enabled value when specified", async () => {
            const input = {
                workflow_id: generateId(),
                name: "Disabled Trigger",
                trigger_type: "webhook" as const,
                config: { method: "POST" as const },
                enabled: false
            };

            const mockRow = generateTriggerRow({
                ...input,
                config: JSON.stringify(input.config),
                enabled: false
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.enabled).toBe(false);
        });
    });

    describe("findById", () => {
        it("should return trigger when found", async () => {
            const triggerId = generateId();
            const mockRow = generateTriggerRow({ id: triggerId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(triggerId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND deleted_at IS NULL"),
                [triggerId]
            );
            expect(result?.id).toBe(triggerId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });

        it("should parse JSON config from string", async () => {
            const triggerId = generateId();
            const config = { path: "/api/hook", method: "POST" };
            const mockRow = generateTriggerRow({
                id: triggerId,
                config: JSON.stringify(config)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(triggerId);

            expect(result?.config).toEqual(config);
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should find trigger by id and workspace id", async () => {
            const triggerId = generateId();
            const workspaceId = generateId();
            const mockRow = generateTriggerRow({ id: triggerId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(triggerId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INNER JOIN flowmaestro.workflows"),
                [triggerId, workspaceId]
            );
            expect(result?.id).toBe(triggerId);
        });

        it("should return null when not found in workspace", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByIdAndWorkspaceId(generateId(), generateId());

            expect(result).toBeNull();
        });
    });

    describe("findByWorkflowId", () => {
        it("should return all triggers for workflow", async () => {
            const workflowId = generateId();
            const mockTriggers = [
                generateTriggerRow({ workflow_id: workflowId }),
                generateTriggerRow({ workflow_id: workflowId })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTriggers));

            const result = await repository.findByWorkflowId(workflowId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workflow_id = $1 AND deleted_at IS NULL"),
                [workflowId]
            );
            expect(result).toHaveLength(2);
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return triggers for workspace", async () => {
            const workspaceId = generateId();
            const mockTriggers = [generateTriggerRow(), generateTriggerRow()];

            mockQuery.mockResolvedValueOnce(mockRows(mockTriggers));

            const result = await repository.findByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INNER JOIN flowmaestro.workflows"),
                expect.arrayContaining([workspaceId])
            );
            expect(result).toHaveLength(2);
        });

        it("should filter by workflowId when provided", async () => {
            const workspaceId = generateId();
            const workflowId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([generateTriggerRow()]));

            await repository.findByWorkspaceId(workspaceId, { workflowId });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND t.workflow_id = $2"),
                expect.arrayContaining([workspaceId, workflowId])
            );
        });

        it("should filter by type when provided", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([generateTriggerRow()]));

            await repository.findByWorkspaceId(workspaceId, { type: "webhook" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND t.trigger_type = $2"),
                expect.arrayContaining([workspaceId, "webhook"])
            );
        });

        it("should filter by enabled when provided", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockRows([generateTriggerRow()]));

            await repository.findByWorkspaceId(workspaceId, { enabled: true });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND t.enabled = $2"),
                expect.arrayContaining([workspaceId, true])
            );
        });
    });

    describe("findByType", () => {
        it("should return triggers of specified type", async () => {
            const mockTriggers = [
                generateTriggerRow({ trigger_type: "webhook" }),
                generateTriggerRow({ trigger_type: "webhook" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTriggers));

            const result = await repository.findByType("webhook");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE trigger_type = $1"),
                expect.arrayContaining(["webhook"])
            );
            expect(result).toHaveLength(2);
        });

        it("should filter by enabled when specified", async () => {
            mockQuery.mockResolvedValueOnce(mockRows([generateTriggerRow()]));

            await repository.findByType("schedule", true);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND enabled = $2"),
                expect.arrayContaining(["schedule", true])
            );
        });
    });

    describe("findScheduledTriggersToProcess", () => {
        it("should return enabled schedule triggers", async () => {
            const mockTriggers = [
                generateTriggerRow({ trigger_type: "schedule", enabled: true }),
                generateTriggerRow({ trigger_type: "schedule", enabled: true })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockTriggers));

            const result = await repository.findScheduledTriggersToProcess();

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("trigger_type = 'schedule'")
            );
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("AND enabled = true"));
            expect(result).toHaveLength(2);
        });
    });

    describe("update", () => {
        it("should update specified fields", async () => {
            const triggerId = generateId();
            const mockRow = generateTriggerRow({ id: triggerId, name: "Updated Name" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(triggerId, { name: "Updated Name" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.workflow_triggers"),
                expect.arrayContaining(["Updated Name", triggerId])
            );
            expect(result?.name).toBe("Updated Name");
        });

        it("should stringify config when updating", async () => {
            const triggerId = generateId();
            const newConfig = { method: "PUT" as const };
            const mockRow = generateTriggerRow({ id: triggerId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(triggerId, { config: newConfig });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(newConfig), triggerId])
            );
        });

        it("should return existing trigger when no updates provided", async () => {
            const triggerId = generateId();
            const mockRow = generateTriggerRow({ id: triggerId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(triggerId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.workflow_triggers"),
                [triggerId]
            );
            expect(result?.id).toBe(triggerId);
        });

        it("should update scheduling fields", async () => {
            const triggerId = generateId();
            const lastTriggeredAt = new Date();
            const nextScheduledAt = new Date();
            const temporalScheduleId = "schedule-123";
            const mockRow = generateTriggerRow({ id: triggerId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.update(triggerId, {
                last_triggered_at: lastTriggeredAt,
                next_scheduled_at: nextScheduledAt,
                temporal_schedule_id: temporalScheduleId
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("last_triggered_at = $1"),
                expect.arrayContaining([lastTriggeredAt, nextScheduledAt, temporalScheduleId])
            );
        });
    });

    describe("recordTrigger", () => {
        it("should increment trigger count and update last_triggered_at", async () => {
            const triggerId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.recordTrigger(triggerId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("trigger_count = trigger_count + 1"),
                [triggerId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("last_triggered_at = CURRENT_TIMESTAMP"),
                [triggerId]
            );
        });
    });

    describe("delete", () => {
        it("should soft delete trigger and return true", async () => {
            const triggerId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(triggerId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET deleted_at = CURRENT_TIMESTAMP"),
                [triggerId]
            );
            expect(result).toBe(true);
        });

        it("should return false when trigger not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("hardDelete", () => {
        it("should permanently delete trigger", async () => {
            const triggerId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.hardDelete(triggerId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.workflow_triggers"),
                [triggerId]
            );
            expect(result).toBe(true);
        });
    });

    describe("createExecution", () => {
        it("should create trigger execution record", async () => {
            const input = {
                trigger_id: generateId(),
                execution_id: generateId(),
                trigger_payload: { data: "test" }
            };

            const mockRow = generateTriggerExecutionRow({
                trigger_id: input.trigger_id,
                execution_id: input.execution_id,
                trigger_payload: JSON.stringify(input.trigger_payload)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.createExecution(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.trigger_executions"),
                expect.arrayContaining([
                    input.trigger_id,
                    input.execution_id,
                    JSON.stringify(input.trigger_payload)
                ])
            );
            expect(result.trigger_id).toBe(input.trigger_id);
        });

        it("should handle null trigger payload", async () => {
            const input = {
                trigger_id: generateId(),
                execution_id: generateId()
            };

            const mockRow = generateTriggerExecutionRow({
                trigger_id: input.trigger_id,
                execution_id: input.execution_id,
                trigger_payload: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.createExecution(input);

            expect(result.trigger_payload).toBeNull();
        });
    });

    describe("findExecutionsByTriggerId", () => {
        it("should return paginated executions with total count", async () => {
            const triggerId = generateId();
            const mockExecutions = [
                generateTriggerExecutionRow({ trigger_id: triggerId }),
                generateTriggerExecutionRow({ trigger_id: triggerId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockExecutions));

            const result = await repository.findExecutionsByTriggerId(triggerId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.executions).toHaveLength(2);
        });

        it("should use default pagination", async () => {
            const triggerId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(0)).mockResolvedValueOnce(mockRows([]));

            await repository.findExecutionsByTriggerId(triggerId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT $2 OFFSET $3"),
                expect.arrayContaining([triggerId, 50, 0])
            );
        });
    });

    describe("createWebhookLog", () => {
        it("should create webhook log entry", async () => {
            const input = {
                trigger_id: generateId(),
                workflow_id: generateId(),
                request_method: "POST",
                request_path: "/api/webhook",
                request_headers: { "content-type": "application/json" },
                request_body: { data: "test" },
                response_status: 200,
                response_body: { success: true },
                ip_address: "127.0.0.1",
                user_agent: "test-agent",
                processing_time_ms: 50
            };

            const mockRow = generateWebhookLogRow({
                trigger_id: input.trigger_id,
                workflow_id: input.workflow_id,
                request_method: input.request_method
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.createWebhookLog(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.webhook_logs"),
                expect.arrayContaining([input.trigger_id, input.workflow_id, input.request_method])
            );
            expect(result.request_method).toBe(input.request_method);
        });

        it("should handle error in webhook log", async () => {
            const input = {
                trigger_id: generateId(),
                request_method: "POST",
                error: "Validation failed"
            };

            const mockRow = generateWebhookLogRow({
                trigger_id: input.trigger_id,
                error: input.error,
                response_status: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.createWebhookLog(input);

            expect(result.error).toBe(input.error);
        });
    });

    describe("findWebhookLogsByTriggerId", () => {
        it("should return paginated logs with total count", async () => {
            const triggerId = generateId();
            const mockLogs = [
                generateWebhookLogRow({ trigger_id: triggerId }),
                generateWebhookLogRow({ trigger_id: triggerId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(50))
                .mockResolvedValueOnce(mockRows(mockLogs));

            const result = await repository.findWebhookLogsByTriggerId(triggerId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(50);
            expect(result.logs).toHaveLength(2);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const triggerId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateTriggerRow({
                id: triggerId,
                last_triggered_at: now,
                next_scheduled_at: now,
                created_at: now,
                updated_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(triggerId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.last_triggered_at).toBeInstanceOf(Date);
            expect(result?.next_scheduled_at).toBeInstanceOf(Date);
        });

        it("should handle null date fields", async () => {
            const triggerId = generateId();
            const mockRow = generateTriggerRow({
                id: triggerId,
                last_triggered_at: null,
                next_scheduled_at: null,
                deleted_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(triggerId);

            expect(result?.last_triggered_at).toBeNull();
            expect(result?.next_scheduled_at).toBeNull();
            expect(result?.deleted_at).toBeNull();
        });

        it("should coerce trigger_count to number", async () => {
            const triggerId = generateId();
            const mockRow = generateTriggerRow({
                id: triggerId,
                trigger_count: "42"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(triggerId);

            expect(result?.trigger_count).toBe(42);
            expect(typeof result?.trigger_count).toBe("number");
        });

        it("should handle config as object (already parsed by pg)", async () => {
            const triggerId = generateId();
            const config = { path: "/test", method: "POST" };
            const mockRow = {
                ...generateTriggerRow({ id: triggerId }),
                config // Already an object, not a string
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(triggerId);

            expect(result?.config).toEqual(config);
        });
    });
});
