import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotListResponse, HubspotObject } from "../types";

/**
 * List Line Items Parameters
 */
export const listLineItemsSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional(),
    archived: z.boolean().optional()
});

export type ListLineItemsParams = z.infer<typeof listLineItemsSchema>;

/**
 * Operation Definition
 */
export const listLineItemsOperation: OperationDefinition = {
    id: "listLineItems",
    name: "List Line Items",
    description: "List all line items in HubSpot CRM with pagination",
    category: "crm",
    inputSchema: listLineItemsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute List Line Items
 */
export async function executeListLineItems(
    client: HubspotClient,
    params: ListLineItemsParams
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

        const response = await client.get<HubspotListResponse<HubspotObject>>(
            "/crm/v3/objects/line_items",
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
                message: error instanceof Error ? error.message : "Failed to list line items",
                retryable: false
            }
        };
    }
}
