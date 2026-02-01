import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotObject } from "../types";

/**
 * Update Line Item Parameters
 */
export const updateLineItemSchema = z.object({
    lineItemId: z.string(),
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export type UpdateLineItemParams = z.infer<typeof updateLineItemSchema>;

/**
 * Operation Definition
 */
export const updateLineItemOperation: OperationDefinition = {
    id: "updateLineItem",
    name: "Update Line Item",
    description: "Update an existing line item in HubSpot CRM",
    category: "crm",
    inputSchema: updateLineItemSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Line Item
 */
export async function executeUpdateLineItem(
    client: HubspotClient,
    params: UpdateLineItemParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<HubspotObject>(
            `/crm/v3/objects/line_items/${params.lineItemId}`,
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
                message: error instanceof Error ? error.message : "Failed to update line item",
                retryable: false
            }
        };
    }
}
