import { getLogger } from "../../../../core/logging";
import { BigCommerceClient } from "../client/BigCommerceClient";
import { GetProductSchema, type GetProductParams } from "../schemas";
import type { BigCommerceProduct } from "./types";
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
                "Retrieve a single product by ID with all details including variants and custom fields",
            category: "products",
            inputSchema: GetProductSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BigCommerce", err: error },
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
    client: BigCommerceClient,
    params: GetProductParams
): Promise<OperationResult> {
    try {
        const response = await client.getProduct(params.product_id, params.include_fields);
        const product = response as BigCommerceProduct;

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
