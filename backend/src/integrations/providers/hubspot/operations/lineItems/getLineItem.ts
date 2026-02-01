import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotObject } from "../types";

/**
 * Get Line Item Parameters
 */
export const getLineItemSchema = z.object({
    lineItemId: z.string(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type GetLineItemParams = z.infer<typeof getLineItemSchema>;

/**
 * Operation Definition
 */
export const getLineItemOperation: OperationDefinition = {
    id: "getLineItem",
    name: "Get Line Item",
    description: "Retrieve a line item by ID from HubSpot CRM",
    category: "crm",
    inputSchema: getLineItemSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Line Item
 */
export async function executeGetLineItem(
    client: HubspotClient,
    params: GetLineItemParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/line_items/${params.lineItemId}`;

        const queryParams: Record<string, unknown> = {};
        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }
        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotObject>(endpoint, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get line item",
                retryable: false
            }
        };
    }
}
