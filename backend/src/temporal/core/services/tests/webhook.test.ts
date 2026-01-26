/**
 * Webhook Service Tests
 *
 * Tests for webhook processing and workflow trigger execution.
 */

import * as crypto from "crypto";

import { TriggerRepository } from "../../../../storage/repositories/TriggerRepository";
import { getTemporalClient } from "../../../client";
import { WebhookService, type WebhookRequestData } from "../webhook";
import type {
    WebhookLog,
    WebhookTriggerConfig,
    WorkflowTrigger
} from "../../../../storage/models/Trigger";

// Mock dependencies
jest.mock("../../../../storage/repositories/TriggerRepository");
jest.mock("../../../client");
jest.mock("../..", () => ({
    createActivityLogger: () => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })
}));

describe("WebhookService", () => {
    let service: WebhookService;
    let mockTriggerRepo: jest.Mocked<TriggerRepository>;
    let mockTemporalClient: {
        workflow: {
            start: jest.Mock;
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockTriggerRepo = {
            findById: jest.fn(),
            update: jest.fn(),
            createWebhookLog: jest.fn(),
            findWebhookLogsByTriggerId: jest.fn()
        } as unknown as jest.Mocked<TriggerRepository>;

        (TriggerRepository as jest.Mock).mockImplementation(() => mockTriggerRepo);

        mockTemporalClient = {
            workflow: {
                start: jest.fn().mockResolvedValue({
                    workflowId: "exec-123"
                })
            }
        };

        (getTemporalClient as jest.Mock).mockResolvedValue(mockTemporalClient);

        service = new WebhookService();
    });

    function createMockRequest(overrides: Partial<WebhookRequestData> = {}): WebhookRequestData {
        return {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": "Test-Agent"
            },
            body: { data: "test" },
            query: {},
            path: "/webhooks/trigger-123",
            ip: "127.0.0.1",
            userAgent: "Test-Agent",
            ...overrides
        };
    }

    function createMockTrigger(overrides = {}): WorkflowTrigger {
        return {
            id: "trigger-123",
            workflow_id: "workflow-456",
            name: "Test Webhook Trigger",
            enabled: true,
            trigger_type: "webhook",
            config: {
                authType: "none",
                method: "ANY",
                responseFormat: "json"
            } as WebhookTriggerConfig,
            webhook_secret: null,
            last_triggered_at: null,
            next_scheduled_at: null,
            trigger_count: 0,
            temporal_schedule_id: null,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
            ...overrides
        };
    }

    describe("processWebhook", () => {
        describe("trigger validation", () => {
            it("should return 404 if trigger not found", async () => {
                mockTriggerRepo.findById.mockResolvedValue(null);

                const result = await service.processWebhook("trigger-123", createMockRequest());

                expect(result.success).toBe(false);
                expect(result.statusCode).toBe(404);
                expect(result.error).toContain("Trigger not found");
            });

            it("should return 403 if trigger is disabled", async () => {
                mockTriggerRepo.findById.mockResolvedValue(createMockTrigger({ enabled: false }));

                const result = await service.processWebhook("trigger-123", createMockRequest());

                expect(result.success).toBe(false);
                expect(result.statusCode).toBe(403);
                expect(result.error).toContain("disabled");
            });

            it("should log webhook request when trigger not found", async () => {
                mockTriggerRepo.findById.mockResolvedValue(null);

                await service.processWebhook("trigger-123", createMockRequest());

                expect(mockTriggerRepo.createWebhookLog).toHaveBeenCalledWith(
                    expect.objectContaining({
                        trigger_id: "trigger-123",
                        response_status: 404,
                        error: "Trigger not found"
                    })
                );
            });
        });

        describe("HMAC authentication", () => {
            it("should return 401 if HMAC signature is missing", async () => {
                const trigger = createMockTrigger({
                    config: { authType: "hmac" },
                    webhook_secret: "secret123"
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const result = await service.processWebhook("trigger-123", createMockRequest());

                expect(result.success).toBe(false);
                expect(result.statusCode).toBe(401);
                expect(result.error).toContain("Authentication failed");
            });

            it("should return 401 if HMAC signature is invalid", async () => {
                const trigger = createMockTrigger({
                    config: { authType: "hmac" },
                    webhook_secret: "secret123"
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({
                    headers: {
                        "x-hub-signature-256": "sha256=invalidsignature"
                    }
                });

                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(false);
                expect(result.statusCode).toBe(401);
            });

            it("should accept valid HMAC signature", async () => {
                const secret = "secret123";
                const body = { data: "test" };
                const signature = crypto
                    .createHmac("sha256", secret)
                    .update(JSON.stringify(body))
                    .digest("hex");

                const trigger = createMockTrigger({
                    config: { authType: "hmac" },
                    webhook_secret: secret
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({
                    body,
                    headers: {
                        "x-hub-signature-256": `sha256=${signature}`
                    }
                });

                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(true);
                expect(result.statusCode).toBe(202);
            });

            it("should accept signature without algorithm prefix", async () => {
                const secret = "secret123";
                const body = { data: "test" };
                const signature = crypto
                    .createHmac("sha256", secret)
                    .update(JSON.stringify(body))
                    .digest("hex");

                const trigger = createMockTrigger({
                    config: { authType: "hmac" },
                    webhook_secret: secret
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({
                    body,
                    headers: {
                        "x-signature": signature
                    }
                });

                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(true);
            });
        });

        describe("HTTP method validation", () => {
            it("should return 405 if method does not match config", async () => {
                const trigger = createMockTrigger({
                    config: { method: "POST" }
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({ method: "GET" });
                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(false);
                expect(result.statusCode).toBe(405);
                expect(result.message).toContain("Method not allowed");
            });

            it("should accept any method when config is ANY", async () => {
                const trigger = createMockTrigger({
                    config: { method: "ANY" }
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({ method: "PUT" });
                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(true);
            });

            it("should accept matching method", async () => {
                const trigger = createMockTrigger({
                    config: { method: "POST" }
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({ method: "POST" });
                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(true);
            });

            it("should be case-insensitive for method comparison", async () => {
                const trigger = createMockTrigger({
                    config: { method: "POST" }
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({ method: "post" });
                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(true);
            });
        });

        describe("origin validation", () => {
            it("should return 403 if origin not in allowed list", async () => {
                const trigger = createMockTrigger({
                    config: {
                        allowedOrigins: ["https://allowed.com"]
                    }
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({
                    headers: {
                        origin: "https://notallowed.com"
                    }
                });

                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(false);
                expect(result.statusCode).toBe(403);
                expect(result.message).toContain("Origin not allowed");
            });

            it("should accept request from allowed origin", async () => {
                const trigger = createMockTrigger({
                    config: {
                        allowedOrigins: ["https://allowed.com"]
                    }
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({
                    headers: {
                        origin: "https://allowed.com"
                    }
                });

                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(true);
            });

            it("should allow any origin when allowedOrigins is empty", async () => {
                const trigger = createMockTrigger({
                    config: {
                        allowedOrigins: []
                    }
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({
                    headers: {
                        origin: "https://any-origin.com"
                    }
                });

                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(true);
            });

            it("should allow requests without origin header", async () => {
                const trigger = createMockTrigger({
                    config: {
                        allowedOrigins: ["https://allowed.com"]
                    }
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest();
                const result = await service.processWebhook("trigger-123", request);

                expect(result.success).toBe(true);
            });
        });

        describe("workflow execution", () => {
            it("should start workflow via Temporal", async () => {
                const trigger = createMockTrigger();
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const result = await service.processWebhook("trigger-123", createMockRequest());

                expect(result.success).toBe(true);
                expect(result.statusCode).toBe(202);
                expect(mockTemporalClient.workflow.start).toHaveBeenCalledWith(
                    "triggeredWorkflow",
                    expect.objectContaining({
                        taskQueue: "flowmaestro-orchestrator"
                    })
                );
            });

            it("should pass trigger and workflow IDs to workflow", async () => {
                const trigger = createMockTrigger();
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                await service.processWebhook("trigger-123", createMockRequest());

                expect(mockTemporalClient.workflow.start).toHaveBeenCalledWith(
                    "triggeredWorkflow",
                    expect.objectContaining({
                        args: [
                            expect.objectContaining({
                                triggerId: "trigger-123",
                                workflowId: "workflow-456"
                            })
                        ]
                    })
                );
            });

            it("should include request payload in workflow args", async () => {
                const trigger = createMockTrigger();
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({
                    body: { customData: "value" },
                    query: { param: "test" }
                });

                await service.processWebhook("trigger-123", request);

                expect(mockTemporalClient.workflow.start).toHaveBeenCalledWith(
                    "triggeredWorkflow",
                    expect.objectContaining({
                        args: [
                            expect.objectContaining({
                                payload: expect.objectContaining({
                                    body: { customData: "value" },
                                    query: { param: "test" },
                                    method: "POST"
                                })
                            })
                        ]
                    })
                );
            });

            it("should return execution ID on success", async () => {
                const trigger = createMockTrigger();
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const result = await service.processWebhook("trigger-123", createMockRequest());

                expect(result.executionId).toBeDefined();
            });
        });

        describe("response format", () => {
            it("should return JSON response by default", async () => {
                const trigger = createMockTrigger({
                    config: { responseFormat: "json" }
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const result = await service.processWebhook("trigger-123", createMockRequest());

                expect(result.message).toBe("Workflow execution started");
            });

            it("should return text response when configured", async () => {
                const trigger = createMockTrigger({
                    config: { responseFormat: "text" }
                });
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const result = await service.processWebhook("trigger-123", createMockRequest());

                expect(result.message).toBe("OK");
            });
        });

        describe("error handling", () => {
            it("should return 500 on internal errors", async () => {
                mockTriggerRepo.findById.mockRejectedValue(new Error("Database error"));

                const result = await service.processWebhook("trigger-123", createMockRequest());

                expect(result.success).toBe(false);
                expect(result.statusCode).toBe(500);
                expect(result.message).toBe("Internal server error");
            });

            it("should return 500 on Temporal client errors", async () => {
                const trigger = createMockTrigger();
                mockTriggerRepo.findById.mockResolvedValue(trigger);
                mockTemporalClient.workflow.start.mockRejectedValue(
                    new Error("Temporal unavailable")
                );

                const result = await service.processWebhook("trigger-123", createMockRequest());

                expect(result.success).toBe(false);
                expect(result.statusCode).toBe(500);
            });

            it("should log errors", async () => {
                // First call throws (in processWebhook), second call returns null (in logWebhookRequest)
                mockTriggerRepo.findById
                    .mockRejectedValueOnce(new Error("Test error"))
                    .mockResolvedValueOnce(null);

                await service.processWebhook("trigger-123", createMockRequest());

                expect(mockTriggerRepo.createWebhookLog).toHaveBeenCalledWith(
                    expect.objectContaining({
                        error: expect.stringContaining("Internal error")
                    })
                );
            });
        });

        describe("logging", () => {
            it("should log successful webhook requests", async () => {
                const trigger = createMockTrigger();
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                await service.processWebhook("trigger-123", createMockRequest());

                expect(mockTriggerRepo.createWebhookLog).toHaveBeenCalledWith(
                    expect.objectContaining({
                        trigger_id: "trigger-123",
                        response_status: 202,
                        execution_id: expect.any(String)
                    })
                );
            });

            it("should include processing time in logs", async () => {
                const trigger = createMockTrigger();
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                await service.processWebhook("trigger-123", createMockRequest());

                expect(mockTriggerRepo.createWebhookLog).toHaveBeenCalledWith(
                    expect.objectContaining({
                        processing_time_ms: expect.any(Number)
                    })
                );
            });

            it("should include request details in logs", async () => {
                const trigger = createMockTrigger();
                mockTriggerRepo.findById.mockResolvedValue(trigger);

                const request = createMockRequest({
                    method: "POST",
                    path: "/webhooks/trigger-123",
                    ip: "192.168.1.1"
                });

                await service.processWebhook("trigger-123", request);

                expect(mockTriggerRepo.createWebhookLog).toHaveBeenCalledWith(
                    expect.objectContaining({
                        request_method: "POST",
                        request_path: "/webhooks/trigger-123",
                        ip_address: "192.168.1.1"
                    })
                );
            });

            it("should not fail if logging fails", async () => {
                const trigger = createMockTrigger();
                mockTriggerRepo.findById.mockResolvedValue(trigger);
                mockTriggerRepo.createWebhookLog.mockRejectedValue(new Error("Log failed"));

                const result = await service.processWebhook("trigger-123", createMockRequest());

                // Should still succeed even if logging fails
                expect(result.success).toBe(true);
            });
        });
    });

    describe("getWebhookUrl", () => {
        it("should return correct webhook URL", () => {
            const url = service.getWebhookUrl("trigger-123", "https://api.example.com");

            expect(url).toBe("https://api.example.com/webhooks/trigger-123");
        });

        it("should handle base URL with trailing slash", () => {
            const url = service.getWebhookUrl("trigger-123", "https://api.example.com/");

            expect(url).toBe("https://api.example.com//webhooks/trigger-123");
        });
    });

    describe("getWebhookLogs", () => {
        it("should fetch webhook logs for trigger", async () => {
            const mockResponse = {
                logs: [{ id: "1" }, { id: "2" }] as unknown as WebhookLog[],
                total: 2
            };
            mockTriggerRepo.findWebhookLogsByTriggerId.mockResolvedValue(mockResponse);

            const result = await service.getWebhookLogs("trigger-123");

            expect(result).toEqual(mockResponse);
            expect(mockTriggerRepo.findWebhookLogsByTriggerId).toHaveBeenCalledWith(
                "trigger-123",
                {}
            );
        });

        it("should pass options to repository", async () => {
            mockTriggerRepo.findWebhookLogsByTriggerId.mockResolvedValue({ logs: [], total: 0 });
            await service.getWebhookLogs("trigger-123", { limit: 10, offset: 5 });

            expect(mockTriggerRepo.findWebhookLogsByTriggerId).toHaveBeenCalledWith("trigger-123", {
                limit: 10,
                offset: 5
            });
        });
    });
});
