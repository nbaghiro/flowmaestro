import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { ListListingsSchema, type ListListingsParams } from "../schemas";
import type { EtsyListingsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Listings operation definition
 */
export const listListingsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listListings",
            name: "List Listings",
            description:
                "List active listings for an Etsy shop with optional filters for state and pagination",
            category: "listings",
            inputSchema: ListListingsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Etsy", err: error }, "Failed to create listListingsOperation");
        throw new Error(
            `Failed to create listListings operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list listings operation
 */
export async function executeListListings(
    client: EtsyClient,
    params: ListListingsParams
): Promise<OperationResult> {
    try {
        const response = await client.listListings({
            shop_id: params.shop_id,
            state: params.state,
            limit: params.limit,
            offset: params.offset
        });

        const data = response as EtsyListingsResponse;

        return {
            success: true,
            data: {
                listings: data.results,
                count: data.count
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list listings",
                retryable: true
            }
        };
    }
}
