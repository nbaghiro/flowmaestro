import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { UpdateListingSchema, type UpdateListingParams } from "../schemas";
import type { EtsyListing } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Update Listing operation definition
 */
export const updateListingOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateListing",
            name: "Update Listing",
            description:
                "Update an existing Etsy listing's title, description, price, quantity, and more",
            category: "listings",
            inputSchema: UpdateListingSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Etsy", err: error }, "Failed to create updateListingOperation");
        throw new Error(
            `Failed to create updateListing operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update listing operation
 */
export async function executeUpdateListing(
    client: EtsyClient,
    params: UpdateListingParams
): Promise<OperationResult> {
    try {
        const response = await client.updateListing(params.shop_id, params.listing_id, {
            quantity: params.quantity,
            title: params.title,
            description: params.description,
            price: params.price,
            who_made: params.who_made,
            when_made: params.when_made,
            taxonomy_id: params.taxonomy_id,
            tags: params.tags,
            materials: params.materials,
            shop_section_id: params.shop_section_id,
            processing_min: params.processing_min,
            processing_max: params.processing_max,
            state: params.state
        });

        const listing = response as EtsyListing;

        return {
            success: true,
            data: {
                listing,
                message: "Listing updated successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update listing";
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
