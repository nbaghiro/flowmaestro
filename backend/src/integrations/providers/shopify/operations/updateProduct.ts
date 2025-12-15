import { toJSONSchema } from "../../../core/schema-utils";
import { ShopifyClient } from "../client/ShopifyClient";
import { UpdateProductSchema, type UpdateProductParams } from "../schemas";
import type { ShopifyProductResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Update Product operation definition
 */
export const updateProductOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateProduct",
            name: "Update Product",
            description: "Update an existing product's title, description, vendor, tags, or status",
            category: "products",
            inputSchema: UpdateProductSchema,
            inputSchemaJSON: toJSONSchema(UpdateProductSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        console.error("[Shopify] Failed to create updateProductOperation:", error);
        throw new Error(
            `Failed to create updateProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update product operation
 */
export async function executeUpdateProduct(
    client: ShopifyClient,
    params: UpdateProductParams
): Promise<OperationResult> {
    try {
        const { product_id, ...updateData } = params;

        const response = await client.updateProduct(product_id, {
            title: updateData.title,
            body_html: updateData.body_html,
            vendor: updateData.vendor,
            product_type: updateData.product_type,
            tags: updateData.tags,
            status: updateData.status
        });

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
                message: error instanceof Error ? error.message : "Failed to update product",
                retryable: true
            }
        };
    }
}
