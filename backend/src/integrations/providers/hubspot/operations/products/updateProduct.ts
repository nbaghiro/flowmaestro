import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotProduct } from "../types";

/**
 * Update Product Parameters
 */
export const updateProductSchema = z.object({
    productId: z.string(),
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export type UpdateProductParams = z.infer<typeof updateProductSchema>;

/**
 * Operation Definition
 */
export const updateProductOperation: OperationDefinition = {
    id: "updateProduct",
    name: "Update Product",
    description: "Update an existing product in HubSpot CRM",
    category: "crm",
    inputSchema: updateProductSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Product
 */
export async function executeUpdateProduct(
    client: HubspotClient,
    params: UpdateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<HubspotProduct>(
            `/crm/v3/objects/products/${params.productId}`,
            { properties: params.properties }
        );

        return {
            success: true,
            data: response
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
