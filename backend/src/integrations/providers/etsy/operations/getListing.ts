import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { GetListingSchema, type GetListingParams } from "../schemas";
import type { EtsyListing } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Listing operation definition
 */
export const getListingOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getListing",
            name: "Get Listing",
            description:
                "Get a single Etsy listing by ID with optional includes for images, shop, etc.",
            category: "listings",
            inputSchema: GetListingSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Etsy", err: error }, "Failed to create getListingOperation");
        throw new Error(
            `Failed to create getListing operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get listing operation
 */
export async function executeGetListing(
    client: EtsyClient,
    params: GetListingParams
): Promise<OperationResult> {
    try {
        const response = await client.getListing(params.listing_id, params.includes);

        const listing = response as EtsyListing;

        return {
            success: true,
            data: {
                listing
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get listing";
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
