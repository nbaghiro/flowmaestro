import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { UpdateProductSchema, type UpdateProductParams } from "../schemas";
import type { SquarespaceProduct } from "./types";
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
            description:
                "Update an existing product in the Squarespace store (uses POST, not PATCH)",
            category: "products",
            inputSchema: UpdateProductSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
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
    client: SquarespaceClient,
    params: UpdateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.updateProduct(params.product_id, {
            name: params.name,
            description: params.description,
            tags: params.tags,
            isVisible: params.isVisible,
            variants: params.variants?.map((v) => ({
                sku: v.sku,
                pricing: v.pricing
                    ? {
                          basePrice: v.pricing.basePrice,
                          salePrice: v.pricing.salePrice,
                          onSale: v.pricing.onSale
                      }
                    : undefined,
                stock: v.stock
                    ? {
                          quantity: v.stock.quantity,
                          unlimited: v.stock.unlimited
                      }
                    : undefined,
                attributes: v.attributes
            }))
        });

        const data = response as SquarespaceProduct;

        return {
            success: true,
            data: {
                product: data
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update product";

        // Check for not found
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Product not found",
                    retryable: false
                }
            };
        }

        // Check for validation errors
        if (errorMessage.includes("Validation error")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: false
            }
        };
    }
}
