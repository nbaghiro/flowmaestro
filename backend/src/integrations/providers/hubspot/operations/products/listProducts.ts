import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotListResponse, HubspotProduct } from "../types";

/**
 * List Products Parameters
 */
export const listProductsSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional(),
    archived: z.boolean().optional()
});

export type ListProductsParams = z.infer<typeof listProductsSchema>;

/**
 * Operation Definition
 */
export const listProductsOperation: OperationDefinition = {
    id: "listProducts",
    name: "List Products",
    description: "List all products in HubSpot CRM with pagination",
    category: "crm",
    inputSchema: listProductsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute List Products
 */
export async function executeListProducts(
    client: HubspotClient,
    params: ListProductsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.after) {
            queryParams.after = params.after;
        }
        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }
        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }
        if (params.archived !== undefined) {
            queryParams.archived = params.archived;
        }

        const response = await client.get<HubspotListResponse<HubspotProduct>>(
            "/crm/v3/objects/products",
            queryParams
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
                message: error instanceof Error ? error.message : "Failed to list products",
                retryable: false
            }
        };
    }
}
