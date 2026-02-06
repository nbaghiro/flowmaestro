import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { GetReceiptSchema, type GetReceiptParams } from "../schemas";
import type { EtsyReceipt } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Receipt operation definition
 */
export const getReceiptOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getReceipt",
            name: "Get Receipt",
            description: "Get a single Etsy receipt (order) by ID with full transaction details",
            category: "orders",
            inputSchema: GetReceiptSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Etsy", err: error }, "Failed to create getReceiptOperation");
        throw new Error(
            `Failed to create getReceipt operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get receipt operation
 */
export async function executeGetReceipt(
    client: EtsyClient,
    params: GetReceiptParams
): Promise<OperationResult> {
    try {
        const response = await client.getReceipt(params.shop_id, params.receipt_id);

        const receipt = response as EtsyReceipt;

        return {
            success: true,
            data: {
                receipt
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get receipt";
        const isNotFound = message.toLowerCase().includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
