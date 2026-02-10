import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { ListReceiptsSchema, type ListReceiptsParams } from "../schemas";
import type { EtsyReceiptsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Receipts operation definition
 */
export const listReceiptsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listReceipts",
            name: "List Receipts",
            description:
                "List shop receipts (orders) with optional filters for payment and shipping status",
            category: "orders",
            inputSchema: ListReceiptsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Etsy", err: error }, "Failed to create listReceiptsOperation");
        throw new Error(
            `Failed to create listReceipts operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list receipts operation
 */
export async function executeListReceipts(
    client: EtsyClient,
    params: ListReceiptsParams
): Promise<OperationResult> {
    try {
        const response = await client.listReceipts({
            shop_id: params.shop_id,
            min_created: params.min_created,
            max_created: params.max_created,
            min_last_modified: params.min_last_modified,
            max_last_modified: params.max_last_modified,
            was_paid: params.was_paid,
            was_shipped: params.was_shipped,
            was_delivered: params.was_delivered,
            limit: params.limit,
            offset: params.offset
        });

        const data = response as EtsyReceiptsResponse;

        return {
            success: true,
            data: {
                receipts: data.results,
                count: data.count
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list receipts",
                retryable: true
            }
        };
    }
}
