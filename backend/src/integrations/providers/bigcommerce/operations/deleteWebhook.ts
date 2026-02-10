import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { DeleteWebhookSchema, type DeleteWebhookParams } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Delete Webhook operation definition
 */
export const deleteWebhookOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteWebhook",
            name: "Delete Webhook",
            description: "Delete a webhook subscription by ID",
            category: "webhooks",
            inputSchema: DeleteWebhookSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
            "Failed to create deleteWebhookOperation"
        );
        throw new Error(
            `Failed to create deleteWebhook operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete webhook operation
 */
export async function executeDeleteWebhook(
    client: BigCommerceClient,
    params: DeleteWebhookParams
): Promise<OperationResult> {
    try {
        await client.deleteWebhook(params.webhook_id);

        return {
            success: true,
            data: {
                webhookId: String(params.webhook_id),
                message: "Webhook deleted successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete webhook";
        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Webhook not found",
                    retryable: false
                }
            };
        }
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: false
            }
        };
    }
}
