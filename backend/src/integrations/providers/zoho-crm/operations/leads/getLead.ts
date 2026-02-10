import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoLead } from "../types";

/**
 * Get Lead Parameters
 */
export const getLeadSchema = z.object({
    id: z.string().min(1, "Lead ID is required"),
    fields: z.array(z.string()).optional()
});

export type GetLeadParams = z.infer<typeof getLeadSchema>;

/**
 * Operation Definition
 */
export const getLeadOperation: OperationDefinition = {
    id: "getLead",
    name: "Get Lead",
    description: "Get a lead by ID from Zoho CRM",
    category: "crm",
    inputSchema: getLeadSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Lead
 */
export async function executeGetLead(
    client: ZohoCrmClient,
    params: GetLeadParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const response = await client.get<ZohoListResponse<ZohoLead>>(
            `/crm/v8/Leads/${params.id}`,
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
                message: "Lead not found",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get lead",
                retryable: false
            }
        };
    }
}
