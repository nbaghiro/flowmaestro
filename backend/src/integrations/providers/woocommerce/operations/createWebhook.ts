import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { CreateWebhookSchema, type CreateWebhookParams } from "../schemas";
import type { WooCommerceWebhook } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Webhook operation definition
 */
export const createWebhookOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createWebhook",
            name: "Create Webhook",
            description: "Create a new webhook subscription for a specific topic",
            category: "webhooks",
            inputSchema: CreateWebhookSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
            "Failed to create createWebhookOperation"
        );
        throw new Error(
            `Failed to create createWebhook operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create webhook operation
 */
export async function executeCreateWebhook(
    client: WooCommerceClient,
    params: CreateWebhookParams
): Promise<OperationResult> {
    try {
        const response = await client.createWebhook({
            name: params.name,
            topic: params.topic,
            delivery_url: params.delivery_url,
            secret: params.secret,
            status: params.status
        });

        const webhook = response as WooCommerceWebhook;

        return {
            success: true,
            data: {
                webhook,
                webhookId: String(webhook.id),
                message: `Webhook created for topic: ${params.topic}`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create webhook",
                retryable: false
            }
        };
    }
}
