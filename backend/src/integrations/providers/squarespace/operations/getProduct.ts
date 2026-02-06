import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { GetProductSchema, type GetProductParams } from "../schemas";
import type { SquarespaceProduct } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Product operation definition
 */
export const getProductOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getProduct",
            name: "Get Product",
            description: "Retrieve a single product by its ID with all variants and images",
            category: "products",
            inputSchema: GetProductSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
            "Failed to create getProductOperation"
        );
        throw new Error(
            `Failed to create getProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get product operation
 */
export async function executeGetProduct(
    client: SquarespaceClient,
    params: GetProductParams
): Promise<OperationResult> {
    try {
        const response = await client.getProduct(params.product_id);
        const data = response as SquarespaceProduct;

        return {
            success: true,
            data: {
                product: data
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get product";

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
                retryable: true
            }
        };
    }
}
