import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoDeleteResponse } from "../types";

/**
 * Delete Lead Parameters
 */
export const deleteLeadSchema = z.object({
    id: z.string().min(1, "Lead ID is required")
});

export type DeleteLeadParams = z.infer<typeof deleteLeadSchema>;

/**
 * Operation Definition
 */
export const deleteLeadOperation: OperationDefinition = {
    id: "deleteLead",
    name: "Delete Lead",
    description: "Delete a lead from Zoho CRM",
    category: "crm",
    inputSchema: deleteLeadSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Lead
 */
export async function executeDeleteLead(
    client: ZohoCrmClient,
    params: DeleteLeadParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<ZohoDeleteResponse>(`/crm/v8/Leads?ids=${params.id}`);

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: {
                    deleted: true,
                    leadId: params.id
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to delete lead",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete lead",
                retryable: false
            }
        };
    }
}
