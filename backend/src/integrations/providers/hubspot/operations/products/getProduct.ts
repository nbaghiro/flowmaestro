import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotProduct } from "../types";

/**
 * Get Product Parameters
 */
export const getProductSchema = z.object({
    productId: z.string(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type GetProductParams = z.infer<typeof getProductSchema>;

/**
 * Operation Definition
 */
export const getProductOperation: OperationDefinition = {
    id: "getProduct",
    name: "Get Product",
    description: "Retrieve a product by ID from HubSpot CRM",
    category: "crm",
    inputSchema: getProductSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Product
 */
export async function executeGetProduct(
    client: HubspotClient,
    params: GetProductParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/products/${params.productId}`;

        const queryParams: Record<string, unknown> = {};
        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }
        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotProduct>(endpoint, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get product",
                retryable: false
            }
        };
    }
}
