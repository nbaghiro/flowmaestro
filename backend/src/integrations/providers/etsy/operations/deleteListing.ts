import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { DeleteListingSchema, type DeleteListingParams } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Delete Listing operation definition
 */
export const deleteListingOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteListing",
            name: "Delete Listing",
            description: "Delete an Etsy listing permanently",
            category: "listings",
            inputSchema: DeleteListingSchema,
            retryable: false, // Don't retry deletes
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Etsy", err: error }, "Failed to create deleteListingOperation");
        throw new Error(
            `Failed to create deleteListing operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete listing operation
 */
export async function executeDeleteListing(
    client: EtsyClient,
    params: DeleteListingParams
): Promise<OperationResult> {
    try {
        await client.deleteListing(params.shop_id, params.listing_id);

        return {
            success: true,
            data: {
                listingId: params.listing_id,
                message: "Listing deleted successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete listing";
        const isNotFound = message.toLowerCase().includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
