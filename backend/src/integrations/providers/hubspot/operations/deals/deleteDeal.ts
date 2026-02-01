import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";

/**
 * Delete Deal Parameters
 */
export const deleteDealSchema = z.object({
    dealId: z.string()
});

export type DeleteDealParams = z.infer<typeof deleteDealSchema>;

/**
 * Operation Definition
 */
export const deleteDealOperation: OperationDefinition = {
    id: "deleteDeal",
    name: "Delete Deal",
    description: "Delete a deal by ID (archives the deal)",
    category: "crm",
    inputSchema: deleteDealSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Deal
 */
export async function executeDeleteDeal(
    client: HubspotClient,
    params: DeleteDealParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/deals/${params.dealId}`);

        return {
            success: true,
            data: {
                deleted: true,
                dealId: params.dealId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete deal",
                retryable: false
            }
        };
    }
}
