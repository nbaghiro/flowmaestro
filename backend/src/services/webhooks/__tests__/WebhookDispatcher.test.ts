/**
 * WebhookDispatcher Tests
 *
 * Tests for webhook dispatch and retry service (WebhookDispatcher.ts)
 */

import * as crypto from "crypto";

// Mock the logging module
jest.mock("../../../core/logging", () => ({
    createServiceLogger: jest.fn().mockReturnValue({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
    })
}));

// Mock repository functions
const mockFindByUserAndEvent = jest.fn();
const mockWebhookFindById = jest.fn();
const mockCreate = jest.fn();
const mockMarkSuccess = jest.fn();
const mockMarkFailed = jest.fn();
const mockIncrementAttempt = jest.fn();
const mockScheduleRetry = jest.fn();
const mockFindPendingRetries = jest.fn();

jest.mock("../../../storage/repositories/OutgoingWebhookRepository", () => ({
    OutgoingWebhookRepository: jest.fn().mockImplementation(() => ({
        findByUserAndEvent: mockFindByUserAndEvent,
        findById: mockWebhookFindById
    })),
    WebhookDeliveryRepository: jest.fn().mockImplementation(() => ({
        create: mockCreate,
        markSuccess: mockMarkSuccess,
        markFailed: mockMarkFailed,
        incrementAttempt: mockIncrementAttempt,
        scheduleRetry: mockScheduleRetry,
        findPendingRetries: mockFindPendingRetries
    }))
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { WebhookDispatcher, ExecutionEventData } from "../WebhookDispatcher";

function createMockWebhook(overrides: Record<string, unknown> = {}) {
    return {
        id: "webhook-123",
        user_id: "user-123",
        url: "https://example.com/webhook",
        secret: "webhook-secret-key",
        events: ["execution.completed"],
        is_active: true,
        headers: {},
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides
    };
}

function createMockDelivery(overrides: Record<string, unknown> = {}) {
    return {
        id: "delivery-123",
        webhook_id: "webhook-123",
        event_type: "execution.completed",
        payload: { id: "test", event: "execution.completed", data: {} },
        status: "pending",
        attempts: 0,
        created_at: new Date(),
        updated_at: new Date(),
        ...overrides
    };
}

function createMockEventData(): ExecutionEventData {
    return {
        execution_id: "exec-123",
        workflow_id: "wf-123",
        workflow_name: "Test Workflow",
        status: "completed",
        started_at: "2024-01-01T00:00:00Z",
        completed_at: "2024-01-01T00:01:00Z"
    };
}

describe("WebhookDispatcher", () => {
    let dispatcher: WebhookDispatcher;

    beforeEach(() => {
        jest.clearAllMocks();
        dispatcher = new WebhookDispatcher();
    });

    describe("dispatch", () => {
        it("should not dispatch when no webhooks are subscribed", async () => {
            mockFindByUserAndEvent.mockResolvedValue([]);

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockFindByUserAndEvent).toHaveBeenCalledWith("user-123", "execution.completed");
            expect(mockCreate).not.toHaveBeenCalled();
        });

        it("should dispatch to all subscribed webhooks", async () => {
            const webhooks = [
                createMockWebhook({ id: "wh-1", url: "https://example1.com" }),
                createMockWebhook({ id: "wh-2", url: "https://example2.com" })
            ];
            mockFindByUserAndEvent.mockResolvedValue(webhooks);
            mockCreate.mockResolvedValue(createMockDelivery());
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue("OK")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockCreate).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it("should create delivery record before sending", async () => {
            mockFindByUserAndEvent.mockResolvedValue([createMockWebhook()]);
            mockCreate.mockResolvedValue(createMockDelivery());
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue("OK")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    webhook_id: "webhook-123",
                    event_type: "execution.completed"
                })
            );
        });

        it("should handle dispatch errors gracefully", async () => {
            mockFindByUserAndEvent.mockRejectedValue(new Error("Database error"));

            // Should not throw
            await expect(
                dispatcher.dispatch("user-123", "execution.completed", createMockEventData())
            ).resolves.toBeUndefined();
        });
    });

    describe("Webhook sending", () => {
        beforeEach(() => {
            mockFindByUserAndEvent.mockResolvedValue([createMockWebhook()]);
            mockCreate.mockResolvedValue(createMockDelivery());
        });

        it("should send webhook with correct headers", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue("OK")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockFetch).toHaveBeenCalledWith(
                "https://example.com/webhook",
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        "Content-Type": "application/json",
                        "User-Agent": "FlowMaestro-Webhook/1.0"
                    })
                })
            );
        });

        it("should include HMAC signature in headers", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue("OK")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            const fetchCall = mockFetch.mock.calls[0];
            const headers = fetchCall[1].headers;

            expect(headers["X-FlowMaestro-Signature"]).toMatch(/^v1=[a-f0-9]{64}$/);
        });

        it("should include delivery ID in headers", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue("OK")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            const fetchCall = mockFetch.mock.calls[0];
            const headers = fetchCall[1].headers;

            expect(headers["X-FlowMaestro-Delivery-ID"]).toBe("delivery-123");
        });

        it("should include event type in headers", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue("OK")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            const fetchCall = mockFetch.mock.calls[0];
            const headers = fetchCall[1].headers;

            expect(headers["X-FlowMaestro-Event"]).toBe("execution.completed");
        });

        it("should include custom webhook headers", async () => {
            mockFindByUserAndEvent.mockResolvedValue([
                createMockWebhook({ headers: { "X-Custom-Header": "custom-value" } })
            ]);
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue("OK")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            const fetchCall = mockFetch.mock.calls[0];
            const headers = fetchCall[1].headers;

            expect(headers["X-Custom-Header"]).toBe("custom-value");
        });

        it("should mark delivery as success on 2xx response", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue("Success")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockMarkSuccess).toHaveBeenCalledWith("delivery-123", 200, "Success");
        });
    });

    describe("Retry logic", () => {
        beforeEach(() => {
            mockFindByUserAndEvent.mockResolvedValue([createMockWebhook()]);
            mockCreate.mockResolvedValue(createMockDelivery());
        });

        it("should schedule retry on 429 rate limit", async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 429,
                statusText: "Too Many Requests",
                text: jest.fn().mockResolvedValue("Rate limited")
            });
            mockIncrementAttempt.mockResolvedValue({
                ...createMockDelivery(),
                status: "retrying",
                attempts: 1
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockIncrementAttempt).toHaveBeenCalled();
            expect(mockScheduleRetry).toHaveBeenCalled();
        });

        it("should schedule retry on 500 server error", async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: "Internal Server Error",
                text: jest.fn().mockResolvedValue("Error")
            });
            mockIncrementAttempt.mockResolvedValue({
                ...createMockDelivery(),
                status: "retrying",
                attempts: 1
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockScheduleRetry).toHaveBeenCalled();
        });

        it("should schedule retry on 502 bad gateway", async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 502,
                statusText: "Bad Gateway",
                text: jest.fn().mockResolvedValue("")
            });
            mockIncrementAttempt.mockResolvedValue({
                ...createMockDelivery(),
                status: "retrying",
                attempts: 1
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockScheduleRetry).toHaveBeenCalled();
        });

        it("should schedule retry on 503 service unavailable", async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 503,
                statusText: "Service Unavailable",
                text: jest.fn().mockResolvedValue("")
            });
            mockIncrementAttempt.mockResolvedValue({
                ...createMockDelivery(),
                status: "retrying",
                attempts: 1
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockScheduleRetry).toHaveBeenCalled();
        });

        it("should schedule retry on network error", async () => {
            mockFetch.mockRejectedValue(new Error("Network error"));
            mockIncrementAttempt.mockResolvedValue({
                ...createMockDelivery(),
                status: "retrying",
                attempts: 1
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockIncrementAttempt).toHaveBeenCalledWith(
                "delivery-123",
                null,
                null,
                "Network error"
            );
            expect(mockScheduleRetry).toHaveBeenCalled();
        });

        it("should not retry on 400 bad request", async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 400,
                statusText: "Bad Request",
                text: jest.fn().mockResolvedValue("Invalid payload")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockMarkFailed).toHaveBeenCalledWith("delivery-123");
            expect(mockScheduleRetry).not.toHaveBeenCalled();
        });

        it("should not retry on 401 unauthorized", async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 401,
                statusText: "Unauthorized",
                text: jest.fn().mockResolvedValue("Invalid credentials")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockMarkFailed).toHaveBeenCalledWith("delivery-123");
        });

        it("should not retry on 404 not found", async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: "Not Found",
                text: jest.fn().mockResolvedValue("Endpoint not found")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            expect(mockMarkFailed).toHaveBeenCalledWith("delivery-123");
        });
    });

    describe("processRetries", () => {
        it("should do nothing when no pending retries", async () => {
            mockFindPendingRetries.mockResolvedValue([]);

            await dispatcher.processRetries();

            expect(mockWebhookFindById).not.toHaveBeenCalled();
        });

        it("should process pending retries", async () => {
            const pendingDelivery = createMockDelivery({
                status: "retrying",
                attempts: 1,
                payload: { id: "test", event: "execution.completed", data: createMockEventData() }
            });
            mockFindPendingRetries.mockResolvedValue([pendingDelivery]);
            mockWebhookFindById.mockResolvedValue(createMockWebhook());
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue("OK")
            });

            await dispatcher.processRetries();

            expect(mockFetch).toHaveBeenCalled();
            expect(mockMarkSuccess).toHaveBeenCalled();
        });

        it("should mark delivery as failed when webhook is inactive", async () => {
            const pendingDelivery = createMockDelivery({ status: "retrying" });
            mockFindPendingRetries.mockResolvedValue([pendingDelivery]);
            mockWebhookFindById.mockResolvedValue(createMockWebhook({ is_active: false }));

            await dispatcher.processRetries();

            expect(mockMarkFailed).toHaveBeenCalledWith("delivery-123");
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("should mark delivery as failed when webhook is deleted", async () => {
            const pendingDelivery = createMockDelivery({ status: "retrying" });
            mockFindPendingRetries.mockResolvedValue([pendingDelivery]);
            mockWebhookFindById.mockResolvedValue(createMockWebhook({ deleted_at: new Date() }));

            await dispatcher.processRetries();

            expect(mockMarkFailed).toHaveBeenCalledWith("delivery-123");
        });

        it("should mark delivery as failed when webhook not found", async () => {
            const pendingDelivery = createMockDelivery({ status: "retrying" });
            mockFindPendingRetries.mockResolvedValue([pendingDelivery]);
            mockWebhookFindById.mockResolvedValue(null);

            await dispatcher.processRetries();

            expect(mockMarkFailed).toHaveBeenCalledWith("delivery-123");
        });

        it("should prevent concurrent retry processing", async () => {
            mockFindPendingRetries.mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
            );

            // Start two processRetries calls
            const promise1 = dispatcher.processRetries();
            const promise2 = dispatcher.processRetries();

            await Promise.all([promise1, promise2]);

            // Should only call findPendingRetries once
            expect(mockFindPendingRetries).toHaveBeenCalledTimes(1);
        });
    });

    describe("Retry processor lifecycle", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
            dispatcher.stopRetryProcessor();
        });

        it("should start retry processor with interval", async () => {
            mockFindPendingRetries.mockResolvedValue([]);

            dispatcher.startRetryProcessor(1000);

            // Run first interval
            jest.advanceTimersByTime(1000);
            await Promise.resolve(); // Let async work complete

            expect(mockFindPendingRetries).toHaveBeenCalled();
        });

        it("should not start multiple processors", async () => {
            mockFindPendingRetries.mockResolvedValue([]);

            dispatcher.startRetryProcessor(1000);
            dispatcher.startRetryProcessor(1000); // Second call should be ignored

            jest.advanceTimersByTime(1000);
            await Promise.resolve();

            // Should only have one processor running
            const callsBefore = mockFindPendingRetries.mock.calls.length;

            jest.advanceTimersByTime(1000);
            await Promise.resolve();

            // Should have only one more call
            expect(mockFindPendingRetries).toHaveBeenCalledTimes(callsBefore + 1);
        });

        it("should stop retry processor", async () => {
            mockFindPendingRetries.mockResolvedValue([]);

            dispatcher.startRetryProcessor(1000);
            jest.advanceTimersByTime(1000);
            await Promise.resolve();

            const callsBeforeStop = mockFindPendingRetries.mock.calls.length;
            dispatcher.stopRetryProcessor();

            jest.advanceTimersByTime(3000);
            await Promise.resolve();

            // Should not have any more calls after stopping
            expect(mockFindPendingRetries).toHaveBeenCalledTimes(callsBeforeStop);
        });
    });

    describe("HMAC signature generation", () => {
        it("should generate valid HMAC-SHA256 signature", async () => {
            mockFindByUserAndEvent.mockResolvedValue([createMockWebhook()]);
            mockCreate.mockResolvedValue(createMockDelivery());
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue("OK")
            });

            await dispatcher.dispatch("user-123", "execution.completed", createMockEventData());

            const fetchCall = mockFetch.mock.calls[0];
            const body = fetchCall[1].body;
            const signatureHeader = fetchCall[1].headers["X-FlowMaestro-Signature"];

            // Extract signature from header
            const signature = signatureHeader.replace("v1=", "");

            // Verify signature
            const expectedSignature = crypto
                .createHmac("sha256", "webhook-secret-key")
                .update(body)
                .digest("hex");

            expect(signature).toBe(expectedSignature);
        });
    });
});
