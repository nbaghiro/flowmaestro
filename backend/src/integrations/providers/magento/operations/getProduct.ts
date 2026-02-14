import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { GetProductSchema, type GetProductParams } from "../schemas";
import type { MagentoProduct } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getProductOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getProduct",
            name: "Get Product",
            description: "Retrieve a single product by its SKU",
            category: "products",
            inputSchema: GetProductSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Magento", err: error }, "Failed to create getProductOperation");
        throw new Error(
            `Failed to create getProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetProduct(
    client: MagentoClient,
    params: GetProductParams
): Promise<OperationResult> {
    try {
        const response = await client.getProduct(params.sku);
        const product = response as MagentoProduct;

        return {
            success: true,
            data: {
                product
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
