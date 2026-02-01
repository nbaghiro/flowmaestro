import { getLogger } from "../../../../core/logging";
import { ShopifyClient } from "../client/ShopifyClient";
import { ListWebhooksSchema, type ListWebhooksParams } from "../schemas";
import type { ShopifyWebhooksResponse } from "./types";
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
            description: "Retrieve a list of registered webhooks for this store",
            category: "webhooks",
            inputSchema: ListWebhooksSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Shopify", err: error },
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
    client: ShopifyClient,
    params: ListWebhooksParams
): Promise<OperationResult> {
    try {
        const response = await client.listWebhooks({
            address: params.address,
            topic: params.topic,
            limit: params.limit,
            since_id: params.since_id
        });

        const data = response as ShopifyWebhooksResponse;

        return {
            success: true,
            data: {
                webhooks: data.webhooks,
                count: data.webhooks.length
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
