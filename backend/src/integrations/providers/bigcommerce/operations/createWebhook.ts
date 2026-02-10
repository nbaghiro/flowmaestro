import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { CreateWebhookSchema, type CreateWebhookParams } from "../schemas";
import type { BigCommerceWebhook } from "./types";
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
            description: "Create a new webhook subscription for a specific scope",
            category: "webhooks",
            inputSchema: CreateWebhookSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
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
    client: BigCommerceClient,
    params: CreateWebhookParams
): Promise<OperationResult> {
    try {
        const response = await client.createWebhook({
            scope: params.scope,
            destination: params.destination,
            is_active: params.is_active,
            headers: params.headers
        });

        const webhook = response as BigCommerceWebhook;

        return {
            success: true,
            data: {
                webhook,
                webhookId: String(webhook.id),
                message: `Webhook created for scope: ${params.scope}`
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
