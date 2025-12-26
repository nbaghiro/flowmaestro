import { toJSONSchema } from "../../../core/schema-utils";
import { ShopifyClient } from "../client/ShopifyClient";
import { DeleteWebhookSchema, type DeleteWebhookParams } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Delete Webhook operation definition
 */
export const deleteWebhookOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteWebhook",
            name: "Delete Webhook",
            description: "Remove a webhook subscription by its ID",
            category: "webhooks",
            inputSchema: DeleteWebhookSchema,
            inputSchemaJSON: toJSONSchema(DeleteWebhookSchema),
            retryable: true, // Deletion is idempotent
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Shopify", err: error }, "Failed to create deleteWebhookOperation");
        throw new Error(
            `Failed to create deleteWebhook operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete webhook operation
 */
export async function executeDeleteWebhook(
    client: ShopifyClient,
    params: DeleteWebhookParams
): Promise<OperationResult> {
    try {
        await client.deleteWebhook(params.webhook_id);

        return {
            success: true,
            data: {
                webhookId: params.webhook_id,
                message: "Webhook deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete webhook",
                retryable: true
            }
        };
    }
}
