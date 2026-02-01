import { getLogger } from "../../../../core/logging";
import { ShopifyClient } from "../client/ShopifyClient";
import { GetProductSchema, type GetProductParams } from "../schemas";
import type { ShopifyProductResponse } from "./types";
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
                "Retrieve a single product by its ID with full details including variants and images",
            category: "products",
            inputSchema: GetProductSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Shopify", err: error }, "Failed to create getProductOperation");
        throw new Error(
            `Failed to create getProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get product operation
 */
export async function executeGetProduct(
    client: ShopifyClient,
    params: GetProductParams
): Promise<OperationResult> {
    try {
        const response = await client.getProduct(params.product_id, params.fields);
        const data = response as ShopifyProductResponse;

        return {
            success: true,
            data: {
                product: data.product
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get product",
                retryable: true
            }
        };
    }
}
