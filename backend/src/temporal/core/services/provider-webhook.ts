/**
 * Provider Webhook Service
 * Handles incoming webhooks from integration providers (GitHub, Slack, etc.)
 * and triggers associated workflow executions.
 */

import type { JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "..";
import { providerRegistry } from "../../../integrations/registry";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { getTemporalClient } from "../../client";

const logger = createActivityLogger({ component: "ProviderWebhookService" });

export interface ProviderWebhookRequest {
    providerId: string;
    triggerId: string;
    headers: Record<string, string | string[] | undefined>;
    body: unknown;
    rawBody?: Buffer;
    query: Record<string, unknown>;
    method: string;
    path: string;
    ip?: string;
    userAgent?: string;
}

export interface ProviderWebhookResponse {
    success: boolean;
    executionId?: string;
    message?: string;
    error?: string;
    statusCode: number;
}

export class ProviderWebhookService {
    private triggerRepo: TriggerRepository;

    constructor() {
        this.triggerRepo = new TriggerRepository();
    }

    /**
     * Process incoming provider webhook
     */
    async processProviderWebhook(
        request: ProviderWebhookRequest
    ): Promise<ProviderWebhookResponse> {
        const startTime = Date.now();
        const { providerId, triggerId } = request;

        try {
            // Find trigger
            const trigger = await this.triggerRepo.findById(triggerId);
            if (!trigger) {
                await this.logWebhookRequest(request, 404, null, "Trigger not found");
                return {
                    success: false,
                    error: "Trigger not found",
                    statusCode: 404
                };
            }

            // Check if trigger is enabled
            if (!trigger.enabled) {
                await this.logWebhookRequest(request, 403, null, "Trigger is disabled");
                return {
                    success: false,
                    error: "Trigger is disabled",
                    statusCode: 403
                };
            }

            // Verify trigger is for this provider
            const triggerConfig = trigger.config as { providerId?: string };
            if (triggerConfig.providerId !== providerId) {
                await this.logWebhookRequest(request, 400, null, "Provider mismatch");
                return {
                    success: false,
                    error: "Provider mismatch",
                    statusCode: 400
                };
            }

            // Verify webhook signature
            const webhookSecret = trigger.webhook_secret;
            if (webhookSecret) {
                const verificationResult = await providerRegistry.verifyWebhookSignature(
                    providerId,
                    webhookSecret,
                    {
                        headers: request.headers,
                        body:
                            typeof request.body === "string"
                                ? request.body
                                : JSON.stringify(request.body),
                        rawBody: request.rawBody
                    }
                );

                if (!verificationResult.valid) {
                    logger.warn("Invalid webhook signature", {
                        providerId,
                        triggerId,
                        error: verificationResult.error
                    });
                    await this.logWebhookRequest(
                        request,
                        401,
                        null,
                        verificationResult.error || "Invalid signature"
                    );
                    return {
                        success: false,
                        error: "Invalid webhook signature",
                        statusCode: 401
                    };
                }
            }

            // Extract event type from webhook
            const eventType = await providerRegistry.extractEventType(providerId, {
                headers: request.headers,
                body:
                    typeof request.body === "string" ? request.body : JSON.stringify(request.body),
                rawBody: request.rawBody
            });

            // Verify event type matches trigger configuration
            const expectedEventId = (trigger.config as { eventId?: string }).eventId;
            if (expectedEventId && eventType && eventType !== expectedEventId) {
                // Event type doesn't match - this is OK, just don't trigger
                logger.debug("Event type mismatch, skipping", {
                    providerId,
                    triggerId,
                    receivedEvent: eventType,
                    expectedEvent: expectedEventId
                });
                return {
                    success: true,
                    message: "Event type not configured for this trigger",
                    statusCode: 200
                };
            }

            // Prepare payload for workflow
            const payload: Record<string, JsonValue> = {
                provider: providerId,
                eventType: eventType || "unknown",
                headers: request.headers as JsonValue,
                body: request.body as JsonValue,
                query: request.query as JsonValue,
                method: request.method,
                timestamp: new Date().toISOString(),
                triggerId: triggerId
            };

            // Start workflow execution
            const client = await getTemporalClient();
            const workflowId = `provider-webhook-${providerId}-${triggerId}-${Date.now()}`;

            const handle = await client.workflow.start("triggeredWorkflow", {
                taskQueue: "flowmaestro-orchestrator",
                workflowId,
                args: [
                    {
                        triggerId: trigger.id,
                        workflowId: trigger.workflow_id,
                        payload
                    }
                ]
            });

            const executionId = handle.workflowId;

            logger.info("Started workflow from provider webhook", {
                executionId,
                providerId,
                triggerId,
                eventType,
                workflowId: trigger.workflow_id
            });

            // Log successful webhook
            const processingTime = Date.now() - startTime;
            await this.logWebhookRequest(
                request,
                202,
                { executionId, message: "Workflow triggered" },
                null,
                executionId,
                processingTime
            );

            return {
                success: true,
                executionId,
                message: "Workflow execution started",
                statusCode: 202
            };
        } catch (error) {
            logger.error(
                "Error processing provider webhook",
                error instanceof Error ? error : new Error(String(error)),
                { providerId, triggerId }
            );

            const processingTime = Date.now() - startTime;
            await this.logWebhookRequest(
                request,
                500,
                null,
                `Internal error: ${error}`,
                undefined,
                processingTime
            );

            return {
                success: false,
                error: "Internal server error",
                statusCode: 500
            };
        }
    }

    /**
     * Log webhook request for auditing
     */
    private async logWebhookRequest(
        request: ProviderWebhookRequest,
        responseStatus: number,
        responseBody: unknown,
        error: string | null,
        executionId?: string,
        processingTimeMs?: number
    ): Promise<void> {
        try {
            await this.triggerRepo.createWebhookLog({
                trigger_id: request.triggerId,
                request_method: request.method,
                request_path: request.path,
                request_headers: request.headers as Record<string, JsonValue>,
                request_body: request.body as Record<string, JsonValue>,
                request_query: request.query as Record<string, JsonValue>,
                response_status: responseStatus,
                response_body: responseBody as Record<string, JsonValue>,
                error: error || undefined,
                execution_id: executionId,
                ip_address: request.ip,
                user_agent: request.userAgent,
                processing_time_ms: processingTimeMs
            });
        } catch (logError) {
            // Don't fail the webhook if logging fails
            logger.warn("Failed to log webhook request", {
                error: logError,
                triggerId: request.triggerId
            });
        }
    }
}

// Export singleton instance
export const providerWebhookService = new ProviderWebhookService();
