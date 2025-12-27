/**
 * Trigger.dev Webhook Service
 *
 * Handles webhook trigger processing via Trigger.dev tasks.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { TriggerRepository } from "../../storage/repositories/TriggerRepository";
import { WorkflowRepository } from "../../storage/repositories/WorkflowRepository";
import { workflowExecutor } from "../tasks";

const logger = createServiceLogger("WebhookService");

export interface WebhookRequestData {
    method: string;
    headers: Record<string, string | string[]>;
    body: Record<string, unknown>;
    query: Record<string, unknown>;
    path: string;
    ip?: string;
    userAgent?: string;
}

export interface WebhookResult {
    success: boolean;
    executionId?: string;
    message?: string;
    error?: string;
    statusCode?: number;
}

/**
 * WebhookService - Processes webhook triggers via Trigger.dev
 */
export class WebhookService {
    private triggerRepo = new TriggerRepository();
    private workflowRepo = new WorkflowRepository();

    /**
     * Process an incoming webhook request
     */
    async processWebhook(triggerId: string, requestData: WebhookRequestData): Promise<WebhookResult> {
        try {
            // Get the trigger
            const trigger = await this.triggerRepo.findById(triggerId);

            if (!trigger) {
                return {
                    success: false,
                    error: "Webhook trigger not found",
                    statusCode: 404
                };
            }

            if (trigger.trigger_type !== "webhook") {
                return {
                    success: false,
                    error: "Invalid trigger type",
                    statusCode: 400
                };
            }

            if (!trigger.enabled) {
                return {
                    success: false,
                    error: "Webhook trigger is disabled",
                    statusCode: 403
                };
            }

            // Load the workflow
            const workflow = await this.workflowRepo.findById(trigger.workflow_id);

            if (!workflow) {
                return {
                    success: false,
                    error: "Workflow not found",
                    statusCode: 404
                };
            }

            // Create execution record
            const executionId = `webhook-${triggerId}-${Date.now()}`;

            // Build inputs from webhook data
            const inputs: JsonObject = {
                __webhook: {
                    method: requestData.method,
                    headers: requestData.headers as JsonObject,
                    query: requestData.query as JsonObject,
                    path: requestData.path,
                    ip: requestData.ip || null,
                    userAgent: requestData.userAgent || null
                } as JsonObject,
                ...(requestData.body as JsonObject)
            };

            // Trigger workflow execution (non-blocking)
            workflowExecutor.trigger({
                executionId,
                workflowId: workflow.id,
                userId: workflow.user_id,
                definition: workflow.definition,
                inputs,
                triggerType: "webhook",
                meta: {
                    triggerId,
                    webhookMethod: requestData.method
                }
            }).catch((error) => {
                logger.error(
                    { triggerId, executionId, error },
                    "Failed to trigger workflow from webhook"
                );
            });

            // Update trigger stats
            await this.triggerRepo.recordTrigger(triggerId);

            logger.info(
                { triggerId, executionId, method: requestData.method },
                "Webhook triggered workflow execution"
            );

            return {
                success: true,
                executionId,
                message: "Workflow execution started",
                statusCode: 202
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error({ triggerId, error: errorMessage }, "Webhook processing failed");

            return {
                success: false,
                error: errorMessage,
                statusCode: 500
            };
        }
    }
}
