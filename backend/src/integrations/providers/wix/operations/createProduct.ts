import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { CreateProductSchema, type CreateProductParams } from "../schemas";
import type { WixProductResponse } from "./types";
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
            description: "Create a new product in the store",
            category: "products",
            inputSchema: CreateProductSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create createProductOperation");
        throw new Error(
            `Failed to create createProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create product operation
 */
export async function executeCreateProduct(
    client: WixClient,
    params: CreateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.createProduct({
            name: params.name,
            productType: params.productType,
            description: params.description,
            sku: params.sku,
            price: params.price,
            currency: params.currency,
            weight: params.weight,
            visible: params.visible,
            manageVariants: params.manageVariants,
            variants: params.variants,
            media: params.media
        });

        const data = response as WixProductResponse;

        return {
            success: true,
            data: {
                product: data.product,
                productId: data.product.id,
                message: "Product created successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create product";
        const isValidation = message.toLowerCase().includes("validation");

        return {
            success: false,
            error: {
                type: isValidation ? "validation" : "server_error",
                message,
                retryable: !isValidation
            }
        };
    }
}
