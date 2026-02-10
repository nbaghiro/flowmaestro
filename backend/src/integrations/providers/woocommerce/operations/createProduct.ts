import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { CreateProductSchema, type CreateProductParams } from "../schemas";
import type { WooCommerceProduct } from "./types";
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
            description: "Create a new product with details, pricing, and inventory settings",
            category: "products",
            inputSchema: CreateProductSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
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
    client: WooCommerceClient,
    params: CreateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.createProduct({
            name: params.name,
            type: params.type,
            status: params.status,
            description: params.description,
            short_description: params.short_description,
            sku: params.sku,
            regular_price: params.regular_price,
            sale_price: params.sale_price,
            manage_stock: params.manage_stock,
            stock_quantity: params.stock_quantity,
            stock_status: params.stock_status,
            categories: params.categories,
            tags: params.tags,
            images: params.images,
            attributes: params.attributes
        });

        const product = response as WooCommerceProduct;

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
