import { getLogger } from "../../../../core/logging";
import { AmazonSellerCentralClient } from "../client/AmazonSellerCentralClient";
import { GetCatalogItemSchema, type GetCatalogItemParams } from "./schemas";
import type { AmazonCatalogItem } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Catalog Item operation definition
 */
export const getCatalogItemOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCatalogItem",
            name: "Get Catalog Item",
            description: "Get detailed information for a specific ASIN in the Amazon catalog",
            category: "catalog",
            inputSchema: GetCatalogItemSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "AmazonSellerCentral", err: error },
            "Failed to create getCatalogItemOperation"
        );
        throw new Error(
            `Failed to create getCatalogItem operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get catalog item operation
 */
export async function executeGetCatalogItem(
    client: AmazonSellerCentralClient,
    params: GetCatalogItemParams
): Promise<OperationResult> {
    try {
        const response = await client.getCatalogItem(params.asin, {
            marketplaceIds: params.marketplaceIds,
            includedData: params.includedData
        });

        const item = response as AmazonCatalogItem;

        return {
            success: true,
            data: {
                item
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get catalog item";
        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Catalog item not found",
                    retryable: false
                }
            };
        }
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
