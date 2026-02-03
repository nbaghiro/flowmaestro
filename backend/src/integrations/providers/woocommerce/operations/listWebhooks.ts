import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { ListWebhooksSchema, type ListWebhooksParams } from "../schemas";
import type { WooCommerceWebhook } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Webhooks operation definition
 */
export const listWebhooksOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listWebhooks",
            name: "List Webhooks",
            description: "Retrieve a list of registered webhooks",
            category: "webhooks",
            inputSchema: ListWebhooksSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
            "Failed to create listWebhooksOperation"
        );
        throw new Error(
            `Failed to create listWebhooks operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list webhooks operation
 */
export async function executeListWebhooks(
    client: WooCommerceClient,
    params: ListWebhooksParams
): Promise<OperationResult> {
    try {
        const response = await client.listWebhooks({
            status: params.status,
            page: params.page,
            per_page: params.per_page
        });

        const webhooks = response as WooCommerceWebhook[];

        return {
            success: true,
            data: {
                webhooks,
                count: webhooks.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list webhooks",
                retryable: true
            }
        };
    }
}
