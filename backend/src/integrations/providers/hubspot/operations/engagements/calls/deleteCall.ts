import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";

/**
 * Delete Call Parameters
 */
export const deleteCallSchema = z.object({
    callId: z.string()
});

export type DeleteCallParams = z.infer<typeof deleteCallSchema>;

/**
 * Operation Definition
 */
export const deleteCallOperation: OperationDefinition = {
    id: "deleteCall",
    name: "Delete Call",
    description: "Delete (archive) a call engagement in HubSpot CRM",
    category: "crm",
    inputSchema: deleteCallSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Call
 */
export async function executeDeleteCall(
    client: HubspotClient,
    params: DeleteCallParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/calls/${params.callId}`);

        return {
            success: true,
            data: { deleted: true }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete call",
                retryable: false
            }
        };
    }
}
