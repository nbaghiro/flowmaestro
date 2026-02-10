import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoDeleteResponse } from "../../types";

/**
 * Delete Call Parameters
 */
export const deleteCallSchema = z.object({
    id: z.string().min(1, "Call ID is required")
});

export type DeleteCallParams = z.infer<typeof deleteCallSchema>;

/**
 * Operation Definition
 */
export const deleteCallOperation: OperationDefinition = {
    id: "deleteCall",
    name: "Delete Call",
    description: "Delete a call log from Zoho CRM",
    category: "crm",
    inputSchema: deleteCallSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Call
 */
export async function executeDeleteCall(
    client: ZohoCrmClient,
    params: DeleteCallParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<ZohoDeleteResponse>(`/crm/v8/Calls?ids=${params.id}`);

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: {
                    deleted: true,
                    callId: params.id
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to delete call",
                retryable: false
            }
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
