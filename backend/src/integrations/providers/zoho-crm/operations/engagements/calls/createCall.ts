import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoCall } from "../../types";

/**
 * Create Call Parameters
 */
export const createCallSchema = z.object({
    Subject: z.string().min(1, "Subject is required"),
    Call_Type: z.string().optional(),
    Call_Start_Time: z.string().optional(),
    Call_Duration: z.string().optional(),
    Call_Purpose: z.string().optional(),
    Call_Result: z.string().optional(),
    Description: z.string().optional(),
    What_Id: z.object({ id: z.string() }).optional(),
    Who_Id: z.object({ id: z.string() }).optional()
});

export type CreateCallParams = z.infer<typeof createCallSchema>;

/**
 * Operation Definition
 */
export const createCallOperation: OperationDefinition = {
    id: "createCall",
    name: "Create Call",
    description: "Create a new call log in Zoho CRM",
    category: "crm",
    inputSchema: createCallSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Call
 */
export async function executeCreateCall(
    client: ZohoCrmClient,
    params: CreateCallParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoRecordResponse<ZohoCall>>("/crm/v8/Calls", {
            data: [params]
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
                message: response.data?.[0]?.message || "Failed to create call",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create call",
                retryable: false
            }
        };
    }
}
