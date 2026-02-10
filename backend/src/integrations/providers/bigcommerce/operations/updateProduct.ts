import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { UpdateProductSchema, type UpdateProductParams } from "../schemas";
import type { BigCommerceProduct } from "./types";
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
            description: "Update an existing product's details, pricing, or inventory",
            category: "products",
            inputSchema: UpdateProductSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
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
    client: BigCommerceClient,
    params: UpdateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.updateProduct(params.product_id, {
            name: params.name,
            sku: params.sku,
            description: params.description,
            price: params.price,
            cost_price: params.cost_price,
            retail_price: params.retail_price,
            sale_price: params.sale_price,
            weight: params.weight,
            categories: params.categories,
            inventory_level: params.inventory_level,
            is_visible: params.is_visible
        });

        const product = response as BigCommerceProduct;

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
