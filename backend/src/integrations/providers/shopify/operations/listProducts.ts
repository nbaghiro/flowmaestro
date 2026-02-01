import { getLogger } from "../../../../core/logging";
import { ShopifyClient } from "../client/ShopifyClient";
import { ListProductsSchema, type ListProductsParams } from "../schemas";
import type { ShopifyProductsResponse } from "./types";
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
                "Retrieve a list of products with optional filters for title, vendor, type, and status",
            category: "products",
            inputSchema: ListProductsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Shopify", err: error },
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
    client: ShopifyClient,
    params: ListProductsParams
): Promise<OperationResult> {
    try {
        const response = await client.listProducts({
            ids: params.ids,
            limit: params.limit,
            since_id: params.since_id,
            title: params.title,
            vendor: params.vendor,
            product_type: params.product_type,
            status: params.status,
            created_at_min: params.created_at_min,
            created_at_max: params.created_at_max,
            updated_at_min: params.updated_at_min,
            updated_at_max: params.updated_at_max,
            fields: params.fields
        });

        const data = response as ShopifyProductsResponse;

        return {
            success: true,
            data: {
                products: data.products,
                count: data.products.length
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
