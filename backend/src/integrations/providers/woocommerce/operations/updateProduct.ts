import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { UpdateProductSchema, type UpdateProductParams } from "../schemas";
import type { WooCommerceProduct } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Update Product operation definition
 */
export const updateProductOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateProduct",
            name: "Update Product",
            description: "Update an existing product's details, pricing, or stock",
            category: "products",
            inputSchema: UpdateProductSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
            "Failed to create updateProductOperation"
        );
        throw new Error(
            `Failed to create updateProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update product operation
 */
export async function executeUpdateProduct(
    client: WooCommerceClient,
    params: UpdateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.updateProduct(params.product_id, {
            name: params.name,
            status: params.status,
            description: params.description,
            short_description: params.short_description,
            sku: params.sku,
            regular_price: params.regular_price,
            sale_price: params.sale_price,
            manage_stock: params.manage_stock,
            stock_quantity: params.stock_quantity,
            stock_status: params.stock_status
        });

        const product = response as WooCommerceProduct;

        return {
            success: true,
            data: {
                product,
                message: "Product updated successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update product";
        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Product not found",
                    retryable: false
                }
            };
        }
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
