import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { CreateListingSchema, type CreateListingParams } from "../schemas";
import type { EtsyListing } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Listing operation definition
 */
export const createListingOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createListing",
            name: "Create Listing",
            description: "Create a new draft listing in an Etsy shop",
            category: "listings",
            inputSchema: CreateListingSchema,
            retryable: false, // Don't retry creates to avoid duplicates
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Etsy", err: error }, "Failed to create createListingOperation");
        throw new Error(
            `Failed to create createListing operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create listing operation
 */
export async function executeCreateListing(
    client: EtsyClient,
    params: CreateListingParams
): Promise<OperationResult> {
    try {
        const response = await client.createListing(params.shop_id, {
            quantity: params.quantity,
            title: params.title,
            description: params.description,
            price: params.price,
            who_made: params.who_made,
            when_made: params.when_made,
            taxonomy_id: params.taxonomy_id,
            shipping_profile_id: params.shipping_profile_id,
            return_policy_id: params.return_policy_id,
            materials: params.materials,
            shop_section_id: params.shop_section_id,
            processing_min: params.processing_min,
            processing_max: params.processing_max,
            tags: params.tags,
            styles: params.styles,
            item_weight: params.item_weight,
            item_weight_unit: params.item_weight_unit,
            item_length: params.item_length,
            item_width: params.item_width,
            item_height: params.item_height,
            item_dimensions_unit: params.item_dimensions_unit,
            is_personalizable: params.is_personalizable,
            personalization_is_required: params.personalization_is_required,
            personalization_char_count_max: params.personalization_char_count_max,
            personalization_instructions: params.personalization_instructions,
            is_supply: params.is_supply,
            is_customizable: params.is_customizable
        });

        const listing = response as EtsyListing;

        return {
            success: true,
            data: {
                listing,
                listingId: String(listing.listing_id),
                message: "Listing created successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create listing";
        const isValidation = message.toLowerCase().includes("validation");

        return {
            success: false,
            error: {
                type: isValidation ? "validation" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
