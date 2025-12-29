/**
 * Webhook Service
 * Handles incoming webhook requests and triggers workflow executions
 */

import * as crypto from "crypto";
import type { JsonValue } from "@flowmaestro/shared";
import { createActivityLogger } from "..";
import { WebhookTriggerConfig } from "../../../storage/models/Trigger";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { getTemporalClient } from "../../client";

const logger = createActivityLogger({ component: "WebhookService" });

export interface WebhookRequestData {
    method: string;
    headers: Record<string, string | string[]>;
    body: unknown;
    query: Record<string, unknown>;
    path: string;
    ip?: string;
    userAgent?: string;
}

export interface WebhookResponse {
    success: boolean;
    executionId?: string;
    message?: string;
    error?: string;
    statusCode: number;
}

export class WebhookService {
    private triggerRepo: TriggerRepository;

    constructor() {
        this.triggerRepo = new TriggerRepository();
    }

    /**
     * Process incoming webhook request
     */
    async processWebhook(
        triggerId: string,
        requestData: WebhookRequestData
    ): Promise<WebhookResponse> {
        const startTime = Date.now();

        try {
            // Find trigger
            const trigger = await this.triggerRepo.findById(triggerId);
            if (!trigger) {
                await this.logWebhookRequest(
                    triggerId,
                    requestData,
                    404,
                    null,
                    "Trigger not found"
                );
                return {
                    success: false,
                    message: "Trigger not found",
                    error: "Trigger not found",
                    statusCode: 404
                };
            }

            // Check if trigger is enabled
            if (!trigger.enabled) {
                await this.logWebhookRequest(
                    triggerId,
                    requestData,
                    403,
                    null,
                    "Trigger is disabled"
                );
                return {
                    success: false,
                    message: "Trigger is disabled",
                    error: "Trigger is disabled",
                    statusCode: 403
                };
            }

            // Validate webhook authentication
            const config = trigger.config as WebhookTriggerConfig;
            if (config.authType === "hmac" && trigger.webhook_secret) {
                const isValid = this.verifyHmacSignature(requestData, trigger.webhook_secret);
                if (!isValid) {
                    await this.logWebhookRequest(
                        triggerId,
                        requestData,
                        401,
                        null,
                        "Invalid signature"
                    );
                    return {
                        success: false,
                        message: "Invalid webhook signature",
                        error: "Authentication failed",
                        statusCode: 401
                    };
                }
            }

            // Validate HTTP method if specified
            if (config.method && config.method !== "ANY") {
                if (requestData.method.toUpperCase() !== config.method) {
                    await this.logWebhookRequest(
                        triggerId,
                        requestData,
                        405,
                        null,
                        `Method not allowed. Expected ${config.method}, got ${requestData.method}`
                    );
                    return {
                        success: false,
                        message: `Method not allowed. Expected ${config.method}`,
                        error: "Method not allowed",
                        statusCode: 405
                    };
                }
            }

            // Check allowed origins if specified
            if (config.allowedOrigins && config.allowedOrigins.length > 0) {
                const origin = requestData.headers["origin"] as string;
                if (origin && !config.allowedOrigins.includes(origin)) {
                    await this.logWebhookRequest(
                        triggerId,
                        requestData,
                        403,
                        null,
                        "Origin not allowed"
                    );
                    return {
                        success: false,
                        message: "Origin not allowed",
                        error: "Forbidden",
                        statusCode: 403
                    };
                }
            }

            // Prepare payload from request
            // Cast to JsonValue-compatible types for Temporal workflow
            const payload: Record<string, JsonValue> = {
                headers: requestData.headers as JsonValue,
                body: requestData.body as JsonValue,
                query: requestData.query as JsonValue,
                method: requestData.method,
                timestamp: new Date().toISOString(),
                triggerId: triggerId
            };

            // Trigger workflow execution via Temporal
            const client = await getTemporalClient();
            const workflowId = `webhook-${triggerId}-${Date.now()}`;

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

            logger.info("Started workflow execution from webhook trigger", {
                executionId,
                triggerId,
                workflowId: trigger.workflow_id,
                requestMethod: requestData.method,
                requestPath: requestData.path
            });

            // Log successful webhook
            const processingTime = Date.now() - startTime;
            await this.logWebhookRequest(
                triggerId,
                requestData,
                202,
                { executionId, message: "Workflow triggered" },
                null,
                executionId,
                processingTime
            );

            // Return response based on config
            const responseFormat = config.responseFormat || "json";
            if (responseFormat === "text") {
                return {
                    success: true,
                    executionId,
                    message: "OK",
                    statusCode: 202
                };
            }

            return {
                success: true,
                executionId,
                message: "Workflow execution started",
                statusCode: 202
            };
        } catch (error) {
            logger.error(
                "Error processing webhook",
                error instanceof Error ? error : new Error(String(error)),
                {
                    triggerId,
                    requestMethod: requestData.method,
                    requestPath: requestData.path
                }
            );

            const processingTime = Date.now() - startTime;
            await this.logWebhookRequest(
                triggerId,
                requestData,
                500,
                null,
                `Internal error: ${error}`,
                undefined,
                processingTime
            );

            return {
                success: false,
                message: "Internal server error",
                error: String(error),
                statusCode: 500
            };
        }
    }

    /**
     * Verify HMAC signature for webhook authentication
     */
    private verifyHmacSignature(requestData: WebhookRequestData, secret: string): boolean {
        try {
            // Get signature from headers (common patterns)
            const signature =
                requestData.headers["x-hub-signature-256"] ||
                requestData.headers["x-signature"] ||
                requestData.headers["x-webhook-signature"];

            if (!signature) {
                logger.warn("No signature found in webhook request headers", {
                    availableHeaders: Object.keys(requestData.headers)
                });
                return false;
            }

            // Extract signature value (remove algorithm prefix if present)
            let signatureValue = String(signature);
            if (signatureValue.includes("=")) {
                signatureValue = signatureValue.split("=")[1];
            }

            // Calculate expected signature
            const payload = JSON.stringify(requestData.body);
            const expectedSignature = crypto
                .createHmac("sha256", secret)
                .update(payload)
                .digest("hex");

            // Compare signatures (timing-safe comparison)
            return crypto.timingSafeEqual(
                Buffer.from(signatureValue),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            logger.error(
                "Error verifying webhook signature",
                error instanceof Error ? error : new Error(String(error)),
                {}
            );
            return false;
        }
    }

    /**
     * Log webhook request for debugging and auditing
     */
    private async logWebhookRequest(
        triggerId: string,
        requestData: WebhookRequestData,
        responseStatus: number,
        responseBody: unknown,
        error: string | null,
        executionId?: string,
        processingTimeMs?: number
    ): Promise<void> {
        try {
            const trigger = await this.triggerRepo.findById(triggerId);

            await this.triggerRepo.createWebhookLog({
                trigger_id: triggerId,
                workflow_id: trigger?.workflow_id,
                request_method: requestData.method,
                request_path: requestData.path,
                request_headers: requestData.headers as Record<string, JsonValue>,
                request_body: requestData.body as Record<string, JsonValue> | undefined,
                request_query: requestData.query as Record<string, JsonValue>,
                response_status: responseStatus,
                response_body: responseBody as Record<string, JsonValue> | undefined,
                error: error || undefined,
                execution_id: executionId,
                ip_address: requestData.ip,
                user_agent: requestData.userAgent,
                processing_time_ms: processingTimeMs
            });
        } catch (err) {
            logger.error(
                "Failed to log webhook request",
                err instanceof Error ? err : new Error(String(err)),
                { triggerId, responseStatus }
            );
            // Don't throw - logging failures shouldn't break webhook processing
        }
    }

    /**
     * Get webhook URL for a trigger
     */
    getWebhookUrl(triggerId: string, baseUrl: string): string {
        return `${baseUrl}/webhooks/${triggerId}`;
    }

    /**
     * Get webhook logs for a trigger
     */
    async getWebhookLogs(triggerId: string, options: { limit?: number; offset?: number } = {}) {
        return this.triggerRepo.findWebhookLogsByTriggerId(triggerId, options);
    }
}
