import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { UpdateProductSchema, type UpdateProductParams } from "../schemas";
import type { MagentoProduct } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const updateProductOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateProduct",
            name: "Update Product",
            description: "Update an existing product by its SKU",
            category: "products",
            inputSchema: UpdateProductSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Magento", err: error },
            "Failed to create updateProductOperation"
        );
        throw new Error(
            `Failed to create updateProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeUpdateProduct(
    client: MagentoClient,
    params: UpdateProductParams
): Promise<OperationResult> {
    try {
        const customAttributes: Array<{ attribute_code: string; value: string }> = [];

        if (params.description) {
            customAttributes.push({ attribute_code: "description", value: params.description });
        }
        if (params.short_description) {
            customAttributes.push({
                attribute_code: "short_description",
                value: params.short_description
            });
        }

        const response = await client.updateProduct(params.sku, {
            name: params.name,
            price: params.price,
            status: params.status ? parseInt(params.status, 10) : undefined,
            visibility: params.visibility ? parseInt(params.visibility, 10) : undefined,
            weight: params.weight,
            custom_attributes: customAttributes.length > 0 ? customAttributes : undefined
        });

        const product = response as MagentoProduct;

        return {
            success: true,
            data: {
                product,
                sku: product.sku,
                message: "Product updated successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update product",
                retryable: false
            }
        };
    }
}
