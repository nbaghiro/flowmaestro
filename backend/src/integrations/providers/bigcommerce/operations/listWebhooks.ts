import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { ListWebhooksSchema, type ListWebhooksParams } from "../schemas";
import type { BigCommerceWebhook } from "./types";
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
            { component: "BigCommerce", err: error },
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
    client: BigCommerceClient,
    params: ListWebhooksParams
): Promise<OperationResult> {
    try {
        const response = await client.listWebhooks({
            page: params.page,
            limit: params.limit,
            scope: params.scope,
            is_active: params.is_active
        });

        const webhooks = response as BigCommerceWebhook[];

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
