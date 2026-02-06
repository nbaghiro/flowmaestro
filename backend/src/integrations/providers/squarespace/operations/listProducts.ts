import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { ListProductsSchema, type ListProductsParams } from "../schemas";
import type { SquarespaceProductsResponse } from "./types";
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
            description:
                "Retrieve all products in a Squarespace store with cursor-based pagination",
            category: "products",
            inputSchema: ListProductsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
            "Failed to create listProductsOperation"
        );
        throw new Error(
            `Failed to create listProducts operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list products operation
 */
export async function executeListProducts(
    client: SquarespaceClient,
    params: ListProductsParams
): Promise<OperationResult> {
    try {
        const response = await client.listProducts({
            type: params.type,
            cursor: params.cursor
        });

        const data = response as SquarespaceProductsResponse;

        return {
            success: true,
            data: {
                products: data.products,
                count: data.products.length,
                nextCursor: data.pagination?.nextPageCursor
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
