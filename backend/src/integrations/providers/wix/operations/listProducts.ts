import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { ListProductsSchema, type ListProductsParams } from "../schemas";
import type { WixProductsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Products operation definition
 */
export const listProductsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listProducts",
            name: "List Products",
            description: "Query products with optional search and pagination filters",
            category: "products",
            inputSchema: ListProductsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create listProductsOperation");
        throw new Error(
            `Failed to create listProducts operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list products operation
 */
export async function executeListProducts(
    client: WixClient,
    params: ListProductsParams
): Promise<OperationResult> {
    try {
        const response = await client.queryProducts({
            query: params.query,
            includeVariants: params.includeVariants,
            limit: params.limit,
            offset: params.offset
        });

        const data = response as WixProductsResponse;
        const products = data.products || [];

        return {
            success: true,
            data: {
                products,
                count: products.length,
                total: data.pagingMetadata?.total,
                hasNext: data.pagingMetadata?.hasNext
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list products",
                retryable: true
            }
        };
    }
}
