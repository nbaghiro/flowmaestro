import { getLogger } from "../../../../core/logging";
import { WooCommerceClient } from "../client/WooCommerceClient";
import { GetProductSchema, type GetProductParams } from "../schemas";
import type { WooCommerceProduct } from "./types";
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
            description:
                "Retrieve a single product by ID with all details including variations and images",
            category: "products",
            inputSchema: GetProductSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "WooCommerce", err: error },
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
    client: WooCommerceClient,
    params: GetProductParams
): Promise<OperationResult> {
    try {
        const response = await client.getProduct(params.product_id);
        const product = response as WooCommerceProduct;

        return {
            success: true,
            data: {
                product
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get product";
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
