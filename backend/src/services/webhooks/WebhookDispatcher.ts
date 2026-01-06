import * as crypto from "crypto";
import type { JsonValue } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import {
    OutgoingWebhookRepository,
    WebhookDeliveryRepository
} from "../../storage/repositories/OutgoingWebhookRepository";
import type {
    WebhookEventType,
    WebhookPayload,
    OutgoingWebhookModel,
    WebhookDeliveryModel
} from "../../storage/models/OutgoingWebhook";

const logger = createServiceLogger("WebhookDispatcher");

/**
 * Retry delays in seconds for exponential backoff.
 * Attempts: 1=immediate, 2=2min, 3=4min, 4=8min, 5=16min
 */
const RETRY_DELAYS = [0, 120, 240, 480, 960];

/**
 * Maximum time to wait for a webhook response (in ms).
 */
const WEBHOOK_TIMEOUT = 10000;

/**
 * HTTP status codes that should trigger a retry.
 */
const RETRYABLE_STATUS_CODES = [408, 425, 429, 500, 502, 503, 504];

/**
 * Event data types for different webhook events.
 */
export interface ExecutionEventData {
    execution_id: string;
    workflow_id: string;
    workflow_name: string;
    status: string;
    started_at: string;
    completed_at?: string;
    outputs?: Record<string, JsonValue>;
    error?: string;
}

export interface ThreadMessageEventData {
    thread_id: string;
    message_id: string;
    agent_id: string;
    agent_name: string;
    role: string;
    content: string;
    status?: string;
    error?: string;
}

export interface AgentExecutionEventData {
    thread_id: string;
    agent_id: string;
    agent_name: string;
    status: string;
    started_at: string;
    completed_at?: string;
    error?: string;
}

type WebhookEventData = ExecutionEventData | ThreadMessageEventData | AgentExecutionEventData;

/**
 * WebhookDispatcher is responsible for dispatching webhook events to user endpoints.
 * It handles signing, delivery, and retry logic.
 */
export class WebhookDispatcher {
    private webhookRepo: OutgoingWebhookRepository;
    private deliveryRepo: WebhookDeliveryRepository;
    private retryInterval: ReturnType<typeof setInterval> | null = null;
    private isProcessingRetries = false;

    constructor() {
        this.webhookRepo = new OutgoingWebhookRepository();
        this.deliveryRepo = new WebhookDeliveryRepository();
    }

    /**
     * Generate HMAC-SHA256 signature for webhook payload.
     */
    private generateSignature(payload: string, secret: string): string {
        return crypto.createHmac("sha256", secret).update(payload).digest("hex");
    }

    /**
     * Dispatch an event to all subscribed webhooks for a user.
     */
    async dispatch<T extends WebhookEventData>(
        userId: string,
        event: WebhookEventType,
        data: T
    ): Promise<void> {
        try {
            // Find all active webhooks subscribed to this event
            const webhooks = await this.webhookRepo.findByUserAndEvent(userId, event);

            if (webhooks.length === 0) {
                logger.debug({ userId, event }, "No webhooks subscribed to event");
                return;
            }

            logger.info(
                { userId, event, webhookCount: webhooks.length },
                "Dispatching webhook event"
            );

            // Create deliveries and send webhooks in parallel
            const deliveryPromises = webhooks.map((webhook) =>
                this.createAndSendDelivery(webhook, event, data)
            );

            await Promise.allSettled(deliveryPromises);
        } catch (error) {
            logger.error({ error, userId, event }, "Failed to dispatch webhook event");
        }
    }

    /**
     * Create a delivery record and attempt to send the webhook.
     */
    private async createAndSendDelivery(
        webhook: OutgoingWebhookModel,
        event: WebhookEventType,
        data: WebhookEventData
    ): Promise<void> {
        // Build the webhook payload
        const payloadObj: WebhookPayload<WebhookEventData> = {
            id: crypto.randomUUID(),
            event,
            created_at: new Date().toISOString(),
            data
        };

        // Create delivery record
        const delivery = await this.deliveryRepo.create({
            webhook_id: webhook.id,
            event_type: event,
            payload: payloadObj as unknown as Record<string, JsonValue>
        });

        // Attempt to send
        await this.sendWebhook(webhook, delivery, payloadObj);
    }

    /**
     * Send a webhook delivery request.
     */
    private async sendWebhook(
        webhook: OutgoingWebhookModel,
        delivery: WebhookDeliveryModel,
        payload: WebhookPayload<WebhookEventData>
    ): Promise<void> {
        const body = JSON.stringify(payload);
        const signature = this.generateSignature(body, webhook.secret);

        try {
            const response = await fetch(webhook.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-FlowMaestro-Signature": `v1=${signature}`,
                    "X-FlowMaestro-Delivery-ID": delivery.id,
                    "X-FlowMaestro-Event": payload.event,
                    "User-Agent": "FlowMaestro-Webhook/1.0",
                    ...(webhook.headers || {})
                },
                body,
                signal: AbortSignal.timeout(WEBHOOK_TIMEOUT)
            });

            const responseBody = await this.safeReadResponseBody(response);

            if (response.ok) {
                // Success
                await this.deliveryRepo.markSuccess(delivery.id, response.status, responseBody);
                logger.info(
                    {
                        deliveryId: delivery.id,
                        webhookId: webhook.id,
                        status: response.status
                    },
                    "Webhook delivered successfully"
                );
            } else if (RETRYABLE_STATUS_CODES.includes(response.status)) {
                // Retryable failure
                await this.handleRetryableFailure(
                    delivery,
                    response.status,
                    responseBody,
                    `HTTP ${response.status}`
                );
            } else {
                // Non-retryable failure (4xx errors except specific ones)
                await this.deliveryRepo.incrementAttempt(
                    delivery.id,
                    response.status,
                    responseBody,
                    `HTTP ${response.status}: ${response.statusText}`
                );
                await this.deliveryRepo.markFailed(delivery.id);
                logger.warn(
                    {
                        deliveryId: delivery.id,
                        webhookId: webhook.id,
                        status: response.status
                    },
                    "Webhook delivery failed (non-retryable)"
                );
            }
        } catch (error) {
            // Network error or timeout
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            await this.handleRetryableFailure(delivery, null, null, errorMessage);
        }
    }

    /**
     * Handle a retryable failure by scheduling a retry.
     */
    private async handleRetryableFailure(
        delivery: WebhookDeliveryModel,
        responseStatus: number | null,
        responseBody: string | null,
        errorMessage: string
    ): Promise<void> {
        const updated = await this.deliveryRepo.incrementAttempt(
            delivery.id,
            responseStatus,
            responseBody,
            errorMessage
        );

        if (!updated) {
            logger.error({ deliveryId: delivery.id }, "Failed to update delivery record");
            return;
        }

        if (updated.status === "retrying") {
            // Schedule retry based on attempt count
            const retryDelay = RETRY_DELAYS[Math.min(updated.attempts, RETRY_DELAYS.length - 1)];
            const nextRetryAt = new Date(Date.now() + retryDelay * 1000);
            await this.deliveryRepo.scheduleRetry(delivery.id, nextRetryAt);

            logger.info(
                {
                    deliveryId: delivery.id,
                    attempt: updated.attempts,
                    nextRetryAt: nextRetryAt.toISOString()
                },
                "Webhook delivery scheduled for retry"
            );
        } else {
            logger.warn(
                {
                    deliveryId: delivery.id,
                    attempts: updated.attempts
                },
                "Webhook delivery failed after max attempts"
            );
        }
    }

    /**
     * Safely read response body, handling errors.
     */
    private async safeReadResponseBody(response: Response): Promise<string | null> {
        try {
            return await response.text();
        } catch {
            return null;
        }
    }

    /**
     * Process pending retry deliveries.
     * This should be called periodically.
     */
    async processRetries(): Promise<void> {
        if (this.isProcessingRetries) {
            return; // Skip if already processing
        }

        this.isProcessingRetries = true;

        try {
            const pendingDeliveries = await this.deliveryRepo.findPendingRetries(50);

            if (pendingDeliveries.length === 0) {
                return;
            }

            logger.info({ count: pendingDeliveries.length }, "Processing pending webhook retries");

            for (const delivery of pendingDeliveries) {
                try {
                    await this.retryDelivery(delivery);
                } catch (error) {
                    logger.error(
                        { error, deliveryId: delivery.id },
                        "Failed to process retry delivery"
                    );
                }
            }
        } catch (error) {
            logger.error({ error }, "Failed to process webhook retries");
        } finally {
            this.isProcessingRetries = false;
        }
    }

    /**
     * Retry a failed delivery.
     */
    private async retryDelivery(delivery: WebhookDeliveryModel): Promise<void> {
        // Get the webhook to get the secret
        const webhook = await this.webhookRepo.findById(delivery.webhook_id);

        if (!webhook || !webhook.is_active || webhook.deleted_at) {
            // Webhook no longer exists or is inactive
            await this.deliveryRepo.markFailed(delivery.id);
            logger.info(
                { deliveryId: delivery.id, webhookId: delivery.webhook_id },
                "Webhook no longer active, marking delivery as failed"
            );
            return;
        }

        // Rebuild payload for sending
        const payload = delivery.payload as unknown as WebhookPayload<WebhookEventData>;
        await this.sendWebhook(webhook, delivery, payload);
    }

    /**
     * Start the retry processor interval.
     */
    startRetryProcessor(intervalMs: number = 30000): void {
        if (this.retryInterval) {
            return; // Already running
        }

        logger.info({ intervalMs }, "Starting webhook retry processor");
        this.retryInterval = setInterval(() => {
            this.processRetries().catch((error) => {
                logger.error({ error }, "Retry processor error");
            });
        }, intervalMs);
    }

    /**
     * Stop the retry processor interval.
     */
    stopRetryProcessor(): void {
        if (this.retryInterval) {
            clearInterval(this.retryInterval);
            this.retryInterval = null;
            logger.info("Webhook retry processor stopped");
        }
    }
}

// Singleton instance for global use
export const webhookDispatcher = new WebhookDispatcher();

// Convenience dispatch functions for specific event types
export async function dispatchExecutionStarted(
    userId: string,
    data: ExecutionEventData
): Promise<void> {
    await webhookDispatcher.dispatch(userId, "execution.started", data);
}

export async function dispatchExecutionCompleted(
    userId: string,
    data: ExecutionEventData
): Promise<void> {
    await webhookDispatcher.dispatch(userId, "execution.completed", data);
}

export async function dispatchExecutionFailed(
    userId: string,
    data: ExecutionEventData
): Promise<void> {
    await webhookDispatcher.dispatch(userId, "execution.failed", data);
}

export async function dispatchExecutionCancelled(
    userId: string,
    data: ExecutionEventData
): Promise<void> {
    await webhookDispatcher.dispatch(userId, "execution.cancelled", data);
}

export async function dispatchThreadMessageCreated(
    userId: string,
    data: ThreadMessageEventData
): Promise<void> {
    await webhookDispatcher.dispatch(userId, "thread.message.created", data);
}

export async function dispatchThreadMessageCompleted(
    userId: string,
    data: ThreadMessageEventData
): Promise<void> {
    await webhookDispatcher.dispatch(userId, "thread.message.completed", data);
}

export async function dispatchThreadMessageFailed(
    userId: string,
    data: ThreadMessageEventData
): Promise<void> {
    await webhookDispatcher.dispatch(userId, "thread.message.failed", data);
}

export async function dispatchAgentExecutionStarted(
    userId: string,
    data: AgentExecutionEventData
): Promise<void> {
    await webhookDispatcher.dispatch(userId, "agent.execution.started", data);
}

export async function dispatchAgentExecutionCompleted(
    userId: string,
    data: AgentExecutionEventData
): Promise<void> {
    await webhookDispatcher.dispatch(userId, "agent.execution.completed", data);
}

export async function dispatchAgentExecutionFailed(
    userId: string,
    data: AgentExecutionEventData
): Promise<void> {
    await webhookDispatcher.dispatch(userId, "agent.execution.failed", data);
}
