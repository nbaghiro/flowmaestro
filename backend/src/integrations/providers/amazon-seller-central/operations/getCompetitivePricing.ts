import { getLogger } from "../../../../core/logging";
import { AmazonSellerCentralClient } from "../client/AmazonSellerCentralClient";
import { GetCompetitivePricingSchema, type GetCompetitivePricingParams } from "./schemas";
import type { AmazonCompetitivePrice } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Competitive Pricing operation definition
 */
export const getCompetitivePricingOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCompetitivePricing",
            name: "Get Competitive Pricing",
            description: "Get competitive pricing for items by ASIN or seller SKU",
            category: "pricing",
            inputSchema: GetCompetitivePricingSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "AmazonSellerCentral", err: error },
            "Failed to create getCompetitivePricingOperation"
        );
        throw new Error(
            `Failed to create getCompetitivePricing operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get competitive pricing operation
 */
export async function executeGetCompetitivePricing(
    client: AmazonSellerCentralClient,
    params: GetCompetitivePricingParams
): Promise<OperationResult> {
    try {
        const response = await client.getCompetitivePricing({
            MarketplaceId: params.marketplaceId,
            ItemType: params.itemType,
            Asins: params.asins,
            Skus: params.skus
        });

        const prices = response as AmazonCompetitivePrice[];

        return {
            success: true,
            data: {
                prices,
                count: prices.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get competitive pricing",
                retryable: true
            }
        };
    }
}
