import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoCall } from "../../types";

/**
 * Update Call Parameters
 */
export const updateCallSchema = z.object({
    id: z.string().min(1, "Call ID is required"),
    Subject: z.string().optional(),
    Call_Type: z.string().optional(),
    Call_Start_Time: z.string().optional(),
    Call_Duration: z.string().optional(),
    Call_Purpose: z.string().optional(),
    Call_Result: z.string().optional(),
    Description: z.string().optional()
});

export type UpdateCallParams = z.infer<typeof updateCallSchema>;

/**
 * Operation Definition
 */
export const updateCallOperation: OperationDefinition = {
    id: "updateCall",
    name: "Update Call",
    description: "Update an existing call log in Zoho CRM",
    category: "crm",
    inputSchema: updateCallSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Call
 */
export async function executeUpdateCall(
    client: ZohoCrmClient,
    params: UpdateCallParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<ZohoRecordResponse<ZohoCall>>(`/crm/v8/Calls/${id}`, {
            data: [updateData]
        });

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: response.data[0].details
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to update call",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update call",
                retryable: false
            }
        };
    }
}
