import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { ShopifyClient } from "../client/ShopifyClient";
import { CreateWebhookSchema, type CreateWebhookParams } from "../schemas";
import type { ShopifyWebhookResponse } from "./types";
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
            description: "Register a new webhook subscription for Shopify events",
            category: "webhooks",
            inputSchema: CreateWebhookSchema,
            inputSchemaJSON: toJSONSchema(CreateWebhookSchema),
            retryable: false, // Creation should not be retried to avoid duplicates
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Shopify", err: error },
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
    client: ShopifyClient,
    params: CreateWebhookParams
): Promise<OperationResult> {
    try {
        const response = await client.createWebhook({
            topic: params.topic,
            address: params.address,
            format: params.format
        });

        const data = response as ShopifyWebhookResponse;

        return {
            success: true,
            data: {
                webhook: data.webhook,
                webhookId: data.webhook.id.toString(),
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
