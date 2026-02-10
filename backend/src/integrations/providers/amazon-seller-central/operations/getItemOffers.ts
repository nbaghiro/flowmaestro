import { getLogger } from "../../../../core/logging";
import { AmazonSellerCentralClient } from "../client/AmazonSellerCentralClient";
import { GetItemOffersSchema, type GetItemOffersParams } from "./schemas";
import type { AmazonOffer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Item Offers operation definition
 */
export const getItemOffersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getItemOffers",
            name: "Get Item Offers",
            description: "Get lowest offer listings for an item including Buy Box data",
            category: "pricing",
            inputSchema: GetItemOffersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "AmazonSellerCentral", err: error },
            "Failed to create getItemOffersOperation"
        );
        throw new Error(
            `Failed to create getItemOffers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get item offers operation
 */
export async function executeGetItemOffers(
    client: AmazonSellerCentralClient,
    params: GetItemOffersParams
): Promise<OperationResult> {
    try {
        const response = await client.getItemOffers(params.asin, {
            MarketplaceId: params.marketplaceId,
            ItemCondition: params.itemCondition
        });

        const offer = response as AmazonOffer;

        return {
            success: true,
            data: {
                offer
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get item offers";
        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Item not found",
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
