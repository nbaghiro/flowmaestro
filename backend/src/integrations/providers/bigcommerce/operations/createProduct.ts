import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { CreateProductSchema, type CreateProductParams } from "../schemas";
import type { BigCommerceProduct } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Create Product operation definition
 */
export const createProductOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createProduct",
            name: "Create Product",
            description: "Create a new product with details, pricing, and variants",
            category: "products",
            inputSchema: CreateProductSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
            "Failed to create createProductOperation"
        );
        throw new Error(
            `Failed to create createProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create product operation
 */
export async function executeCreateProduct(
    client: BigCommerceClient,
    params: CreateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.createProduct({
            name: params.name,
            type: params.type,
            sku: params.sku,
            description: params.description,
            price: params.price,
            cost_price: params.cost_price,
            retail_price: params.retail_price,
            sale_price: params.sale_price,
            weight: params.weight,
            categories: params.categories,
            brand_id: params.brand_id,
            inventory_level: params.inventory_level,
            inventory_tracking: params.inventory_tracking,
            is_visible: params.is_visible,
            variants: params.variants
        });

        const product = response as BigCommerceProduct;

        return {
            success: true,
            data: {
                product,
                productId: String(product.id),
                message: "Product created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create product",
                retryable: false
            }
        };
    }
}
