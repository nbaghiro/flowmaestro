import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";

/**
 * Delete Line Item Parameters
 */
export const deleteLineItemSchema = z.object({
    lineItemId: z.string()
});

export type DeleteLineItemParams = z.infer<typeof deleteLineItemSchema>;

/**
 * Operation Definition
 */
export const deleteLineItemOperation: OperationDefinition = {
    id: "deleteLineItem",
    name: "Delete Line Item",
    description: "Delete (archive) a line item in HubSpot CRM",
    category: "crm",
    inputSchema: deleteLineItemSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Line Item
 */
export async function executeDeleteLineItem(
    client: HubspotClient,
    params: DeleteLineItemParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/line_items/${params.lineItemId}`);

        return {
            success: true,
            data: { deleted: true }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete line item",
                retryable: false
            }
        };
    }
}
