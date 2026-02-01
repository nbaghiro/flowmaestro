import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotProduct } from "../types";

/**
 * Create Product Parameters
 */
export const createProductSchema = z.object({
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    associations: z
        .array(
            z.object({
                to: z.object({
                    id: z.string()
                }),
                types: z.array(
                    z.object({
                        associationCategory: z.string(),
                        associationTypeId: z.number()
                    })
                )
            })
        )
        .optional()
});

export type CreateProductParams = z.infer<typeof createProductSchema>;

/**
 * Operation Definition
 */
export const createProductOperation: OperationDefinition = {
    id: "createProduct",
    name: "Create Product",
    description: "Create a new product in HubSpot CRM",
    category: "crm",
    inputSchema: createProductSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Product
 */
export async function executeCreateProduct(
    client: HubspotClient,
    params: CreateProductParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotProduct>("/crm/v3/objects/products", {
            properties: params.properties,
            associations: params.associations
        });

        return {
            success: true,
            data: response
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
