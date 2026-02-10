import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { GetProductSchema, type GetProductParams } from "../schemas";
import type { WixProductResponse } from "./types";
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
            description: "Get a single product by ID",
            category: "products",
            inputSchema: GetProductSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create getProductOperation");
        throw new Error(
            `Failed to create getProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get product operation
 */
export async function executeGetProduct(
    client: WixClient,
    params: GetProductParams
): Promise<OperationResult> {
    try {
        const response = await client.getProduct(params.productId);
        const data = response as WixProductResponse;

        return {
            success: true,
            data: {
                product: data.product
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get product";
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
