import { toJSONSchema } from "../../../core/schema-utils";
import { ShopifyClient } from "../client/ShopifyClient";
import { CreateProductSchema, type CreateProductParams } from "../schemas";
import type { ShopifyProductResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Create Product operation definition
 */
export const createProductOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createProduct",
            name: "Create Product",
            description: "Create a new product with title, description, variants, and images",
            category: "products",
            inputSchema: CreateProductSchema,
            inputSchemaJSON: toJSONSchema(CreateProductSchema),
            retryable: false, // Creation should not be retried to avoid duplicates
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Shopify", err: error }, "Failed to create createProductOperation");
        throw new Error(
            `Failed to create createProduct operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create product operation
 */
export async function executeCreateProduct(
    client: ShopifyClient,
    params: CreateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.createProduct({
            title: params.title,
            body_html: params.body_html,
            vendor: params.vendor,
            product_type: params.product_type,
            tags: params.tags,
            status: params.status,
            variants: params.variants?.map((v) => ({
                option1: v.option1,
                price: v.price,
                sku: v.sku,
                inventory_quantity: v.inventory_quantity
            })),
            images: params.images?.map((i) => ({
                src: i.src,
                alt: i.alt
            }))
        });

        const data = response as ShopifyProductResponse;

        return {
            success: true,
            data: {
                product: data.product,
                productId: data.product.id.toString(),
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
