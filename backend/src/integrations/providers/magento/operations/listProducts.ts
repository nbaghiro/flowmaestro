import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { ListProductsSchema, type ListProductsParams } from "../schemas";
import type { MagentoProductsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listProductsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listProducts",
            name: "List Products",
            description:
                "Retrieve a list of products with optional filters for status, type, name, and SKU",
            category: "products",
            inputSchema: ListProductsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Magento", err: error },
            "Failed to create listProductsOperation"
        );
        throw new Error(
            `Failed to create listProducts operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListProducts(
    client: MagentoClient,
    params: ListProductsParams
): Promise<OperationResult> {
    try {
        const response = await client.listProducts({
            status: params.status,
            type_id: params.type_id,
            name: params.name,
            sku: params.sku,
            page: params.page,
            pageSize: params.pageSize
        });

        const data = response as MagentoProductsResponse;

        return {
            success: true,
            data: {
                products: data.items,
                total_count: data.total_count,
                page: params.page || 1,
                page_size: params.pageSize || 20
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list products",
                retryable: true
            }
        };
    }
}
