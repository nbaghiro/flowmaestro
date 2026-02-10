import { getLogger } from "../../../../core/logging";
import { AmazonSellerCentralClient } from "../client/AmazonSellerCentralClient";
import { SearchCatalogItemsSchema, type SearchCatalogItemsParams } from "./schemas";
import type { AmazonCatalogItemsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Search Catalog Items operation definition
 */
export const searchCatalogItemsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "searchCatalogItems",
            name: "Search Catalog Items",
            description:
                "Search the Amazon catalog by keywords, ASINs, or other product identifiers",
            category: "catalog",
            inputSchema: SearchCatalogItemsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "AmazonSellerCentral", err: error },
            "Failed to create searchCatalogItemsOperation"
        );
        throw new Error(
            `Failed to create searchCatalogItems operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute search catalog items operation
 */
export async function executeSearchCatalogItems(
    client: AmazonSellerCentralClient,
    params: SearchCatalogItemsParams
): Promise<OperationResult> {
    try {
        const response = await client.searchCatalogItems({
            marketplaceIds: params.marketplaceIds,
            keywords: params.keywords,
            identifiers: params.identifiers,
            identifiersType: params.identifiersType,
            pageSize: params.pageSize,
            pageToken: params.pageToken
        });

        const data = response as AmazonCatalogItemsResponse;

        return {
            success: true,
            data: {
                items: data.items,
                numberOfResults: data.numberOfResults,
                pagination: data.pagination,
                count: data.items.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search catalog items",
                retryable: true
            }
        };
    }
}
