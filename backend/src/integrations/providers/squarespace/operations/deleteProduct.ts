import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { DeleteProductSchema, type DeleteProductParams } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Delete Product operation definition
 */
export const deleteProductOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteProduct",
            name: "Delete Product",
            description: "Delete a product from the Squarespace store",
            category: "products",
            inputSchema: DeleteProductSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
            "Failed to create deleteProductOperation"
        );
        throw new Error(
            `Failed to create deleteProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete product operation
 */
export async function executeDeleteProduct(
    client: SquarespaceClient,
    params: DeleteProductParams
): Promise<OperationResult> {
    try {
        await client.deleteProduct(params.product_id);

        return {
            success: true,
            data: {
                productId: params.product_id,
                message: "Product deleted successfully"
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete product";

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
