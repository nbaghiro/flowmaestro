/**
 * Tests for PersonaApprovalRequestRepository
 */

const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { PersonaApprovalRequestRepository } from "../PersonaApprovalRequestRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generatePersonaApprovalRequestRow,
    generateId
} from "./setup";

describe("PersonaApprovalRequestRepository", () => {
    let repository: PersonaApprovalRequestRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new PersonaApprovalRequestRepository();
    });

    describe("create", () => {
        it("should create an approval request with all fields", async () => {
            const instanceId = generateId();
            const input = {
                instance_id: instanceId,
                action_type: "tool_call" as const,
                tool_name: "slack_send_message",
                action_description: "Send a message to Slack",
                action_arguments: { channel: "#general", message: "Hello!" },
                risk_level: "high" as const,
                estimated_cost_credits: 10,
                agent_context: "Responding to user request",
                alternatives: "Could use email instead",
                expires_at: new Date("2025-01-01T12:00:00Z")
            };

            const mockRow = generatePersonaApprovalRequestRow({
                instance_id: instanceId,
                action_type: "tool_call",
                tool_name: "slack_send_message",
                action_description: "Send a message to Slack",
                action_arguments: JSON.stringify(input.action_arguments),
                risk_level: "high",
                estimated_cost_credits: "10.00",
                agent_context: input.agent_context,
                alternatives: input.alternatives,
                expires_at: input.expires_at
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.persona_approval_requests"),
                [
                    instanceId,
                    "tool_call",
                    "slack_send_message",
                    "Send a message to Slack",
                    JSON.stringify({ channel: "#general", message: "Hello!" }),
                    "high",
                    10,
                    "Responding to user request",
                    "Could use email instead",
                    input.expires_at
                ]
            );

            expect(result.instance_id).toBe(instanceId);
            expect(result.action_type).toBe("tool_call");
            expect(result.tool_name).toBe("slack_send_message");
            expect(result.status).toBe("pending");
        });

        it("should create an approval request with minimal fields", async () => {
            const instanceId = generateId();
            const input = {
                instance_id: instanceId,
                action_type: "tool_call" as const,
                action_description: "Send a message",
                action_arguments: {},
                risk_level: "low" as const
            };

            const mockRow = generatePersonaApprovalRequestRow({
                instance_id: instanceId,
                tool_name: null,
                estimated_cost_credits: null,
                agent_context: null,
                alternatives: null,
                expires_at: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.persona_approval_requests"),
                [instanceId, "tool_call", null, "Send a message", "{}", "low", null, null, null, null]
            );

            expect(result.tool_name).toBeNull();
            expect(result.estimated_cost_credits).toBeNull();
        });
    });

    describe("findById", () => {
        it("should return approval request when found", async () => {
            const id = generateId();
            const mockRow = generatePersonaApprovalRequestRow({ id });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(id);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.persona_approval_requests WHERE id = $1"),
                [id]
            );
            expect(result).not.toBeNull();
            expect(result?.id).toBe(id);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findPendingByInstanceId", () => {
        it("should return pending approval when found", async () => {
            const instanceId = generateId();
            const mockRow = generatePersonaApprovalRequestRow({
                instance_id: instanceId,
                status: "pending"
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findPendingByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE instance_id = $1 AND status = 'pending'"),
                [instanceId]
            );
            expect(result).not.toBeNull();
            expect(result?.instance_id).toBe(instanceId);
            expect(result?.status).toBe("pending");
        });

        it("should return null when no pending approval exists", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findPendingByInstanceId("instance-without-pending");

            expect(result).toBeNull();
        });
    });

    describe("findByInstanceId", () => {
        it("should return all approvals for an instance ordered by created_at DESC", async () => {
            const instanceId = generateId();
            const oldDate = new Date("2024-01-01");
            const newDate = new Date("2024-01-02");
            const mockRows1 = [
                generatePersonaApprovalRequestRow({
                    instance_id: instanceId,
                    status: "approved",
                    created_at: newDate
                }),
                generatePersonaApprovalRequestRow({
                    instance_id: instanceId,
                    status: "denied",
                    created_at: oldDate
                })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockRows1));

            const result = await repository.findByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at DESC"),
                [instanceId]
            );
            expect(result).toHaveLength(2);
        });

        it("should return empty array when no approvals exist", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findByInstanceId("instance-without-approvals");

            expect(result).toEqual([]);
        });
    });

    describe("findPendingByWorkspaceId", () => {
        it("should return pending approvals for a workspace with pagination", async () => {
            const workspaceId = generateId();
            const mockRow = generatePersonaApprovalRequestRow({ status: "pending" });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findPendingByWorkspaceId(workspaceId, {
                limit: 10,
                offset: 0
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("JOIN flowmaestro.persona_instances pi"),
                [workspaceId, 10, 0]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE pi.workspace_id = $1 AND par.status = 'pending'"),
                [workspaceId, 10, 0]
            );
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty("waiting_seconds");
        });

        it("should use default pagination when not provided", async () => {
            const workspaceId = generateId();
            mockQuery.mockResolvedValueOnce(mockRows([]));

            await repository.findPendingByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.any(String),
                [workspaceId, 50, 0] // default limit and offset
            );
        });

        it("should return empty array when no pending approvals", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findPendingByWorkspaceId("workspace-id");

            expect(result).toEqual([]);
        });
    });

    describe("countPendingByWorkspaceId", () => {
        it("should return count of pending approvals", async () => {
            const workspaceId = generateId();
            mockQuery.mockResolvedValueOnce(mockCountResult(5));

            const result = await repository.countPendingByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT COUNT(*) as count"),
                [workspaceId]
            );
            expect(result).toBe(5);
        });

        it("should return 0 when no pending approvals", async () => {
            mockQuery.mockResolvedValueOnce(mockCountResult(0));

            const result = await repository.countPendingByWorkspaceId("workspace-id");

            expect(result).toBe(0);
        });
    });

    describe("update", () => {
        it("should update approval status to approved", async () => {
            const id = generateId();
            const respondedBy = generateId();
            const respondedAt = new Date();
            const mockRow = generatePersonaApprovalRequestRow({
                id,
                status: "approved",
                responded_by: respondedBy,
                responded_at: respondedAt.toISOString()
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(id, {
                status: "approved",
                responded_by: respondedBy,
                responded_at: respondedAt,
                response_note: "Approved by user"
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.persona_approval_requests"),
                [id, "approved", respondedBy, respondedAt, "Approved by user"]
            );
            expect(result?.status).toBe("approved");
            expect(result?.responded_by).toBe(respondedBy);
        });

        it("should update approval status to denied with response note", async () => {
            const id = generateId();
            const mockRow = generatePersonaApprovalRequestRow({
                id,
                status: "denied",
                response_note: "Too risky"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(id, {
                status: "denied",
                response_note: "Too risky"
            });

            expect(result?.status).toBe("denied");
            expect(result?.response_note).toBe("Too risky");
        });

        it("should return null when approval not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.update("non-existent", { status: "approved" });

            expect(result).toBeNull();
        });
    });

    describe("expirePendingBefore", () => {
        it("should expire old pending approvals", async () => {
            const beforeDate = new Date("2024-01-01");
            mockQuery.mockResolvedValueOnce(mockAffectedRows(3));

            const result = await repository.expirePendingBefore(beforeDate);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET status = 'expired'"),
                [beforeDate]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE status = 'pending'"),
                [beforeDate]
            );
            expect(result).toBe(3);
        });

        it("should return 0 when no approvals to expire", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.expirePendingBefore(new Date());

            expect(result).toBe(0);
        });
    });

    describe("cancelPendingByInstanceId", () => {
        it("should cancel all pending approvals for an instance", async () => {
            const instanceId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(2));

            const result = await repository.cancelPendingByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET status = 'expired'"),
                [instanceId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE instance_id = $1 AND status = 'pending'"),
                [instanceId]
            );
            expect(result).toBe(2);
        });

        it("should return 0 when no pending approvals to cancel", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.cancelPendingByInstanceId("instance-id");

            expect(result).toBe(0);
        });
    });

    describe("deleteByInstanceId", () => {
        it("should delete all approvals for an instance", async () => {
            const instanceId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(5));

            const result = await repository.deleteByInstanceId(instanceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.persona_approval_requests WHERE instance_id = $1"),
                [instanceId]
            );
            expect(result).toBe(5);
        });

        it("should return 0 when no approvals to delete", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteByInstanceId("instance-id");

            expect(result).toBe(0);
        });
    });

    describe("hardDelete", () => {
        it("should delete a single approval", async () => {
            const id = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.hardDelete(id);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.persona_approval_requests WHERE id = $1"),
                [id]
            );
            expect(result).toBe(true);
        });

        it("should return false when approval not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.hardDelete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("row mapping", () => {
        it("should parse estimated_cost_credits from string to number", async () => {
            const mockRow = generatePersonaApprovalRequestRow({
                estimated_cost_credits: "25.50"
            });
            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(mockRow.id);

            expect(result?.estimated_cost_credits).toBe(25.5);
            expect(typeof result?.estimated_cost_credits).toBe("number");
        });

        it("should handle null estimated_cost_credits", async () => {
            const mockRow = generatePersonaApprovalRequestRow({
                estimated_cost_credits: null
            });
            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(mockRow.id);

            expect(result?.estimated_cost_credits).toBeNull();
        });

        it("should preserve date fields", async () => {
            const createdAt = new Date("2024-06-15T10:00:00Z");
            const expiresAt = new Date("2024-06-15T11:00:00Z");
            const mockRow = generatePersonaApprovalRequestRow({
                created_at: createdAt,
                expires_at: expiresAt
            });
            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(mockRow.id);

            expect(result?.created_at).toEqual(createdAt);
            expect(result?.expires_at).toEqual(expiresAt);
        });
    });
});
