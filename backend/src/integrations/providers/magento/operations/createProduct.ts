import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { CreateProductSchema, type CreateProductParams } from "../schemas";
import type { MagentoProduct } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createProductOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createProduct",
            name: "Create Product",
            description: "Create a new product in Magento with the specified attributes",
            category: "products",
            inputSchema: CreateProductSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Magento", err: error },
            "Failed to create createProductOperation"
        );
        throw new Error(
            `Failed to create createProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateProduct(
    client: MagentoClient,
    params: CreateProductParams
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
        if (params.meta_title) {
            customAttributes.push({ attribute_code: "meta_title", value: params.meta_title });
        }
        if (params.meta_description) {
            customAttributes.push({
                attribute_code: "meta_description",
                value: params.meta_description
            });
        }

        const response = await client.createProduct({
            sku: params.sku,
            name: params.name,
            price: params.price,
            attribute_set_id: params.attribute_set_id,
            type_id: params.type_id,
            status: parseInt(params.status, 10),
            visibility: parseInt(params.visibility, 10),
            weight: params.weight,
            custom_attributes: customAttributes.length > 0 ? customAttributes : undefined
        });

        const product = response as MagentoProduct;

        return {
            success: true,
            data: {
                product,
                sku: product.sku,
                id: product.id,
                message: "Product created successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create product",
                retryable: false
            }
        };
    }
}
