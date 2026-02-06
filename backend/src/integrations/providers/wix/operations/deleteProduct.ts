import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
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
            description: "Delete a product from the store",
            category: "products",
            inputSchema: DeleteProductSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create deleteProductOperation");
        throw new Error(
            `Failed to create deleteProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete product operation
 */
export async function executeDeleteProduct(
    client: WixClient,
    params: DeleteProductParams
): Promise<OperationResult> {
    try {
        await client.deleteProduct(params.productId);

        return {
            success: true,
            data: {
                productId: params.productId,
                message: "Product deleted successfully"
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete product";
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
