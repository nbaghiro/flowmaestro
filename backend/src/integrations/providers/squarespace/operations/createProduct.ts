import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { CreateProductSchema, type CreateProductParams } from "../schemas";
import type { SquarespaceProduct } from "./types";
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
            description: "Create a new product in the Squarespace store",
            category: "products",
            inputSchema: CreateProductSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
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
    client: SquarespaceClient,
    params: CreateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.createProduct({
            type: params.type,
            storePageId: params.storePageId,
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
                product: data,
                productId: data.id,
                message: "Product created successfully"
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create product";

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
