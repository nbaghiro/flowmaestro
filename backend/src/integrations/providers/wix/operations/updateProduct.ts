import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { UpdateProductSchema, type UpdateProductParams } from "../schemas";
import type { WixProductResponse } from "./types";
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
            description: "Update an existing product",
            category: "products",
            inputSchema: UpdateProductSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create updateProductOperation");
        throw new Error(
            `Failed to create updateProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update product operation
 */
export async function executeUpdateProduct(
    client: WixClient,
    params: UpdateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.updateProduct(params.productId, {
            name: params.name,
            description: params.description,
            sku: params.sku,
            price: params.price,
            weight: params.weight,
            visible: params.visible
        });

        const data = response as WixProductResponse;

        return {
            success: true,
            data: {
                product: data.product,
                message: "Product updated successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update product";
        const isNotFound = message.toLowerCase().includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
