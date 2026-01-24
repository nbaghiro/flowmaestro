/**
 * OutgoingWebhookRepository Tests
 *
 * Tests for outgoing webhook CRUD operations including secret handling,
 * event subscriptions, and workspace-scoped methods.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { OutgoingWebhookRepository, WebhookDeliveryRepository } from "../OutgoingWebhookRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateOutgoingWebhookRow,
    generateWebhookDeliveryRow,
    generateId
} from "./setup";

describe("OutgoingWebhookRepository", () => {
    let repository: OutgoingWebhookRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new OutgoingWebhookRepository();
    });

    describe("create", () => {
        it("should insert a new webhook with generated secret", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "My Webhook",
                url: "https://example.com/webhook",
                events: ["execution.completed", "execution.failed"] as (
                    | "execution.completed"
                    | "execution.failed"
                )[],
                headers: { "X-Custom-Header": "value" }
            };

            const mockRow = generateOutgoingWebhookRow({
                user_id: input.user_id,
                workspace_id: input.workspace_id,
                name: input.name,
                url: input.url,
                events: ["execution.completed", "execution.failed"],
                headers: JSON.stringify(input.headers)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.outgoing_webhooks"),
                expect.arrayContaining([
                    input.user_id,
                    input.workspace_id,
                    input.name,
                    input.url,
                    expect.stringContaining("whsec_"), // generated secret
                    input.events,
                    JSON.stringify(input.headers)
                ])
            );
            expect(result.name).toBe(input.name);
            expect(result.secret).toContain("whsec_");
        });

        it("should handle null headers", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Basic Webhook",
                url: "https://example.com/webhook",
                events: ["execution.completed"] as "execution.completed"[]
            };

            const mockRow = generateOutgoingWebhookRow({
                user_id: input.user_id,
                workspace_id: input.workspace_id,
                name: input.name,
                url: input.url,
                events: ["execution.completed"],
                headers: null
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.headers).toBeNull();
        });
    });

    describe("findById", () => {
        it("should return webhook when found", async () => {
            const webhookId = generateId();
            const mockRow = generateOutgoingWebhookRow({ id: webhookId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(webhookId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND deleted_at IS NULL"),
                [webhookId]
            );
            expect(result?.id).toBe(webhookId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should return webhook for workspace", async () => {
            const webhookId = generateId();
            const workspaceId = generateId();
            const mockRow = generateOutgoingWebhookRow({
                id: webhookId,
                workspace_id: workspaceId
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(webhookId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND workspace_id = $2"),
                [webhookId, workspaceId]
            );
            expect(result?.id).toBe(webhookId);
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return paginated webhooks with total count", async () => {
            const workspaceId = generateId();
            const mockWebhooks = [
                generateOutgoingWebhookRow({ workspace_id: workspaceId }),
                generateOutgoingWebhookRow({ workspace_id: workspaceId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockWebhooks));

            const result = await repository.findByWorkspaceId(workspaceId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.webhooks).toHaveLength(2);
        });

        it("should use default pagination values", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(100))
                .mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT $2 OFFSET $3"),
                [workspaceId, 50, 0]
            );
        });
    });

    describe("findByWorkspaceAndEvent", () => {
        it("should return active webhooks subscribed to event", async () => {
            const workspaceId = generateId();
            const event = "execution.completed" as const;
            const mockWebhooks = [
                generateOutgoingWebhookRow({
                    workspace_id: workspaceId,
                    events: [event],
                    is_active: true
                })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockWebhooks));

            const result = await repository.findByWorkspaceAndEvent(workspaceId, event);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("is_active = true"), [
                workspaceId,
                event
            ]);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("$2 = ANY(events)"),
                expect.anything()
            );
            expect(result).toHaveLength(1);
        });
    });

    describe("updateByWorkspace", () => {
        it("should update specified fields only", async () => {
            const webhookId = generateId();
            const workspaceId = generateId();
            const mockRow = generateOutgoingWebhookRow({
                id: webhookId,
                workspace_id: workspaceId,
                name: "Updated Webhook"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateByWorkspace(webhookId, workspaceId, {
                name: "Updated Webhook"
            });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.outgoing_webhooks"),
                expect.arrayContaining(["Updated Webhook", webhookId, workspaceId])
            );
            expect(result?.name).toBe("Updated Webhook");
        });

        it("should return existing webhook when no updates provided", async () => {
            const webhookId = generateId();
            const workspaceId = generateId();
            const mockRow = generateOutgoingWebhookRow({
                id: webhookId,
                workspace_id: workspaceId
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.updateByWorkspace(webhookId, workspaceId, {});

            expect(result?.id).toBe(webhookId);
        });

        it("should stringify headers when updating", async () => {
            const webhookId = generateId();
            const workspaceId = generateId();
            const headers = { "X-New-Header": "value" };
            const mockRow = generateOutgoingWebhookRow({ id: webhookId });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            await repository.updateByWorkspace(webhookId, workspaceId, { headers });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.anything(),
                expect.arrayContaining([JSON.stringify(headers)])
            );
        });
    });

    describe("regenerateSecretByWorkspace", () => {
        it("should generate and return new secret", async () => {
            const webhookId = generateId();
            const workspaceId = generateId();
            const newSecret = "whsec_newsecret123";

            mockQuery.mockResolvedValueOnce(mockRows([{ secret: newSecret }]));

            const result = await repository.regenerateSecretByWorkspace(webhookId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET secret = $3"),
                expect.arrayContaining([webhookId, workspaceId, expect.stringContaining("whsec_")])
            );
            expect(result).toBe(newSecret);
        });

        it("should return null when webhook not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.regenerateSecretByWorkspace(
                "non-existent",
                generateId()
            );

            expect(result).toBeNull();
        });
    });

    describe("deleteByWorkspace", () => {
        it("should soft delete and deactivate webhook", async () => {
            const webhookId = generateId();
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.deleteByWorkspace(webhookId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET deleted_at = CURRENT_TIMESTAMP, is_active = false"),
                [webhookId, workspaceId]
            );
            expect(result).toBe(true);
        });

        it("should return false when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.deleteByWorkspace("non-existent", generateId());

            expect(result).toBe(false);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const webhookId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateOutgoingWebhookRow({
                id: webhookId,
                created_at: now,
                updated_at: now,
                deleted_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(webhookId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.deleted_at).toBeInstanceOf(Date);
        });

        it("should handle null deleted_at", async () => {
            const webhookId = generateId();
            const mockRow = generateOutgoingWebhookRow({
                id: webhookId,
                deleted_at: null
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(webhookId);

            expect(result?.deleted_at).toBeNull();
        });
    });
});

describe("WebhookDeliveryRepository", () => {
    let repository: WebhookDeliveryRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new WebhookDeliveryRepository();
    });

    describe("create", () => {
        it("should insert a new delivery record", async () => {
            const input = {
                webhook_id: generateId(),
                event_type: "execution.completed" as const,
                payload: { workflowId: "123", status: "completed" }
            };

            const mockRow = generateWebhookDeliveryRow({
                webhook_id: input.webhook_id,
                event_type: input.event_type,
                payload: JSON.stringify(input.payload)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.webhook_deliveries"),
                expect.arrayContaining([
                    input.webhook_id,
                    input.event_type,
                    JSON.stringify(input.payload)
                ])
            );
            expect(result.webhook_id).toBe(input.webhook_id);
            expect(result.status).toBe("pending");
        });
    });

    describe("findById", () => {
        it("should return delivery when found", async () => {
            const deliveryId = generateId();
            const mockRow = generateWebhookDeliveryRow({ id: deliveryId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(deliveryId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                deliveryId
            ]);
            expect(result?.id).toBe(deliveryId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByWebhookId", () => {
        it("should return paginated deliveries with total count", async () => {
            const webhookId = generateId();
            const mockDeliveries = [
                generateWebhookDeliveryRow({ webhook_id: webhookId }),
                generateWebhookDeliveryRow({ webhook_id: webhookId })
            ];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10))
                .mockResolvedValueOnce(mockRows(mockDeliveries));

            const result = await repository.findByWebhookId(webhookId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.deliveries).toHaveLength(2);
        });
    });

    describe("findPendingRetries", () => {
        it("should return deliveries pending retry", async () => {
            const mockDeliveries = [
                generateWebhookDeliveryRow({ status: "retrying" }),
                generateWebhookDeliveryRow({ status: "retrying" })
            ];

            mockQuery.mockResolvedValueOnce(mockRows(mockDeliveries));

            const result = await repository.findPendingRetries(100);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE status = 'retrying'"),
                [100]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("next_retry_at <= CURRENT_TIMESTAMP"),
                expect.anything()
            );
            expect(result).toHaveLength(2);
        });
    });

    describe("markSuccess", () => {
        it("should update delivery as successful", async () => {
            const deliveryId = generateId();
            const responseStatus = 200;
            const responseBody = '{"ok": true}';

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.markSuccess(deliveryId, responseStatus, responseBody);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET status = 'success'"),
                [deliveryId, responseStatus, responseBody]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("attempts = attempts + 1"),
                expect.anything()
            );
        });
    });

    describe("incrementAttempt", () => {
        it("should increment attempt count and update response", async () => {
            const deliveryId = generateId();
            const mockRow = generateWebhookDeliveryRow({
                id: deliveryId,
                attempts: 2,
                status: "retrying"
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.incrementAttempt(
                deliveryId,
                500,
                "Error",
                "Server error"
            );

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("attempts = attempts + 1"),
                expect.anything()
            );
            expect(result?.attempts).toBe(2);
        });
    });

    describe("scheduleRetry", () => {
        it("should set next retry time", async () => {
            const deliveryId = generateId();
            const nextRetryAt = new Date();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.scheduleRetry(deliveryId, nextRetryAt);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET next_retry_at = $2"),
                [deliveryId, nextRetryAt]
            );
        });
    });

    describe("markFailed", () => {
        it("should mark delivery as permanently failed", async () => {
            const deliveryId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.markFailed(deliveryId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET status = 'failed', next_retry_at = NULL"),
                [deliveryId]
            );
        });
    });

    describe("cleanupOldDeliveries", () => {
        it("should delete old completed/failed deliveries", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(100));

            const result = await repository.cleanupOldDeliveries(30);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.webhook_deliveries")
            );
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '30 days'"));
            expect(result).toBe(100);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const deliveryId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateWebhookDeliveryRow({
                id: deliveryId,
                created_at: now,
                last_attempt_at: now,
                next_retry_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(deliveryId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.last_attempt_at).toBeInstanceOf(Date);
            expect(result?.next_retry_at).toBeInstanceOf(Date);
        });

        it("should parse payload from JSON string", async () => {
            const deliveryId = generateId();
            const payload = { workflowId: "123", status: "completed" };
            const mockRow = generateWebhookDeliveryRow({
                id: deliveryId,
                payload: JSON.stringify(payload)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(deliveryId);

            expect(result?.payload).toEqual(payload);
        });
    });
});
