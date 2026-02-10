import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { ListProductsSchema, type ListProductsParams } from "../schemas";
import type { BigCommerceProduct } from "./types";
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
                "Retrieve a list of products with optional filters for name, SKU, category, and pagination",
            category: "products",
            inputSchema: ListProductsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
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
    client: BigCommerceClient,
    params: ListProductsParams
): Promise<OperationResult> {
    try {
        const response = await client.listProducts({
            name: params.name,
            sku: params.sku,
            is_visible: params.is_visible,
            is_featured: params.is_featured,
            type: params.type,
            categories: params.categories,
            brand_id: params.brand_id,
            availability: params.availability,
            include_fields: params.include_fields,
            sort: params.sort,
            direction: params.direction,
            page: params.page,
            limit: params.limit
        });

        const products = response as BigCommerceProduct[];

        return {
            success: true,
            data: {
                products,
                count: products.length
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
