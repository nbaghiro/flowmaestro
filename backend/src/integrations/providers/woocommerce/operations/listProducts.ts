import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { ListProductsSchema, type ListProductsParams } from "../schemas";
import type { WooCommerceProduct } from "./types";
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
                "Retrieve a list of products with optional filters for status, category, stock, and pagination",
            category: "products",
            inputSchema: ListProductsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
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
    client: WooCommerceClient,
    params: ListProductsParams
): Promise<OperationResult> {
    try {
        const response = await client.listProducts({
            status: params.status,
            type: params.type,
            category: params.category,
            tag: params.tag,
            sku: params.sku,
            stock_status: params.stock_status,
            on_sale: params.on_sale,
            page: params.page,
            per_page: params.per_page,
            order: params.order,
            orderby: params.orderby
        });

        const products = response as WooCommerceProduct[];

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
