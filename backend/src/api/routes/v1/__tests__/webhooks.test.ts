/**
 * v1 Webhooks Route Tests
 *
 * Tests for webhook CRUD, test, and deliveries endpoints.
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    apiKeyRequest,
    setupMockApiKey,
    parseResponse,
    mockOutgoingWebhookRepo,
    mockWebhookDeliveryRepo
} from "./setup";

// Setup mocks
jest.mock("../../../../storage/repositories/OutgoingWebhookRepository", () => ({
    OutgoingWebhookRepository: jest.fn().mockImplementation(() => mockOutgoingWebhookRepo),
    WebhookDeliveryRepository: jest.fn().mockImplementation(() => mockWebhookDeliveryRepo)
}));

jest.mock("../../../../storage/models/OutgoingWebhook", () => ({
    WEBHOOK_EVENT_TYPES: [
        "workflow.started",
        "workflow.completed",
        "workflow.failed",
        "execution.started",
        "execution.completed",
        "execution.failed"
    ]
}));

describe("v1 Webhooks Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setupMockApiKey();
    });

    describe("GET /api/v1/webhooks", () => {
        it("should list webhooks", async () => {
            mockOutgoingWebhookRepo.findByWorkspaceId.mockResolvedValue({
                webhooks: [
                    {
                        id: "wh-1",
                        name: "Test Webhook",
                        url: "https://example.com/webhook",
                        events: ["workflow.completed"],
                        is_active: true,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                ],
                total: 1
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/webhooks"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data).toHaveLength(1);
        });
    });

    describe("GET /api/v1/webhooks/:id", () => {
        it("should get webhook by ID", async () => {
            mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "wh-1",
                name: "Test Webhook",
                url: "https://example.com/webhook",
                events: ["workflow.completed"],
                headers: {},
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/webhooks/wh-1"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.id).toBe("wh-1");
        });

        it("should return 404 for non-existent webhook", async () => {
            mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/webhooks/non-existent"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("POST /api/v1/webhooks", () => {
        it("should create webhook", async () => {
            mockOutgoingWebhookRepo.create.mockResolvedValue({
                id: "wh-1",
                name: "New Webhook",
                url: "https://example.com/webhook",
                secret: "secret-key",
                events: ["workflow.completed"],
                headers: {},
                is_active: true,
                created_at: new Date()
            });

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/webhooks",
                payload: {
                    name: "New Webhook",
                    url: "https://example.com/webhook",
                    events: ["workflow.completed"]
                }
            });

            expect(response.statusCode).toBe(201);
            const body = parseResponse(response);
            expect(body.data.id).toBe("wh-1");
            expect(body.data.secret).toBe("secret-key");
        });

        it("should reject invalid URL", async () => {
            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/webhooks",
                payload: {
                    name: "Invalid Webhook",
                    url: "not-a-url",
                    events: ["workflow.completed"]
                }
            });

            expect(response.statusCode).toBe(400);
            const body = parseResponse(response);
            expect(body.error.message).toContain("Invalid URL");
        });

        it("should reject invalid event types", async () => {
            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/webhooks",
                payload: {
                    name: "Invalid Events",
                    url: "https://example.com/webhook",
                    events: ["invalid.event"]
                }
            });

            expect(response.statusCode).toBe(400);
            const body = parseResponse(response);
            expect(body.error.message).toContain("Invalid event types");
        });
    });

    describe("PATCH /api/v1/webhooks/:id", () => {
        it("should update webhook", async () => {
            mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "wh-1"
            });
            mockOutgoingWebhookRepo.updateByWorkspace.mockResolvedValue({
                id: "wh-1",
                name: "Updated Webhook",
                url: "https://example.com/webhook",
                events: ["workflow.completed"],
                headers: {},
                is_active: true,
                updated_at: new Date()
            });

            const response = await apiKeyRequest(fastify, {
                method: "PATCH",
                url: "/api/v1/webhooks/wh-1",
                payload: { name: "Updated Webhook" }
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.name).toBe("Updated Webhook");
        });

        it("should return 404 for non-existent webhook", async () => {
            mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "PATCH",
                url: "/api/v1/webhooks/non-existent",
                payload: { name: "Updated" }
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("DELETE /api/v1/webhooks/:id", () => {
        it("should delete webhook", async () => {
            mockOutgoingWebhookRepo.deleteByWorkspace.mockResolvedValue(true);

            const response = await apiKeyRequest(fastify, {
                method: "DELETE",
                url: "/api/v1/webhooks/wh-1"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.deleted).toBe(true);
        });

        it("should return 404 for non-existent webhook", async () => {
            mockOutgoingWebhookRepo.deleteByWorkspace.mockResolvedValue(false);

            const response = await apiKeyRequest(fastify, {
                method: "DELETE",
                url: "/api/v1/webhooks/non-existent"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("POST /api/v1/webhooks/:id/test", () => {
        it("should send test webhook", async () => {
            mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "wh-1",
                url: "https://example.com/webhook",
                secret: "test-secret",
                headers: {}
            });

            // Mock global fetch
            const mockFetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200
            });
            global.fetch = mockFetch;

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/webhooks/wh-1/test"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.success).toBe(true);
        });

        it("should return 404 for non-existent webhook", async () => {
            mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/webhooks/non-existent/test"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("GET /api/v1/webhooks/:id/deliveries", () => {
        it("should list webhook deliveries", async () => {
            mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "wh-1"
            });
            mockWebhookDeliveryRepo.findByWebhookId.mockResolvedValue({
                deliveries: [
                    {
                        id: "del-1",
                        event_type: "workflow.completed",
                        status: "delivered",
                        attempts: 1,
                        response_status: 200,
                        error_message: null,
                        created_at: new Date(),
                        last_attempt_at: new Date()
                    }
                ],
                total: 1
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/webhooks/wh-1/deliveries"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data).toHaveLength(1);
            expect(body.data[0].status).toBe("delivered");
        });

        it("should return 404 for non-existent webhook", async () => {
            mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/webhooks/non-existent/deliveries"
            });

            expect(response.statusCode).toBe(404);
        });
    });
});
