import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoCall } from "../../types";

/**
 * Get Call Parameters
 */
export const getCallSchema = z.object({
    id: z.string().min(1, "Call ID is required"),
    fields: z.array(z.string()).optional()
});

export type GetCallParams = z.infer<typeof getCallSchema>;

/**
 * Operation Definition
 */
export const getCallOperation: OperationDefinition = {
    id: "getCall",
    name: "Get Call",
    description: "Get a call by ID from Zoho CRM",
    category: "crm",
    inputSchema: getCallSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Call
 */
export async function executeGetCall(
    client: ZohoCrmClient,
    params: GetCallParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const response = await client.get<ZohoListResponse<ZohoCall>>(
            `/crm/v8/Calls/${params.id}`,
            queryParams
        );

        if (response.data?.[0]) {
            return {
                success: true,
                data: response.data[0]
            };
        }

        return {
            success: false,
            error: {
                type: "not_found",
                message: "Call not found",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get call",
                retryable: false
            }
        };
    }
}
