import { getLogger } from "../../../../core/logging";
import { AmazonSellerCentralClient } from "../client/AmazonSellerCentralClient";
import { GetInventorySummariesSchema, type GetInventorySummariesParams } from "./schemas";
import type { AmazonInventorySummariesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Inventory Summaries operation definition
 */
export const getInventorySummariesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getInventorySummaries",
            name: "Get Inventory Summaries",
            description: "Get FBA inventory levels with filtering by SKU, date, and marketplace",
            category: "inventory",
            inputSchema: GetInventorySummariesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "AmazonSellerCentral", err: error },
            "Failed to create getInventorySummariesOperation"
        );
        throw new Error(
            `Failed to create getInventorySummaries operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get inventory summaries operation
 */
export async function executeGetInventorySummaries(
    client: AmazonSellerCentralClient,
    params: GetInventorySummariesParams
): Promise<OperationResult> {
    try {
        const response = await client.getInventorySummaries({
            granularityType: params.granularityType,
            granularityId: params.granularityId,
            marketplaceIds: params.marketplaceIds,
            sellerSkus: params.sellerSkus,
            startDateTime: params.startDateTime
        });

        const data = response as AmazonInventorySummariesResponse;

        return {
            success: true,
            data: {
                granularity: data.granularity,
                inventorySummaries: data.inventorySummaries,
                nextToken: data.nextToken,
                count: data.inventorySummaries.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get inventory summaries",
                retryable: true
            }
        };
    }
}
