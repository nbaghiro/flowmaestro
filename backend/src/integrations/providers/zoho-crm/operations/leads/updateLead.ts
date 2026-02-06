import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoLead } from "../types";

/**
 * Update Lead Parameters
 */
export const updateLeadSchema = z.object({
    id: z.string().min(1, "Lead ID is required"),
    Last_Name: z.string().optional(),
    First_Name: z.string().optional(),
    Email: z.string().email().optional(),
    Phone: z.string().optional(),
    Mobile: z.string().optional(),
    Company: z.string().optional(),
    Website: z.string().url().optional(),
    Lead_Source: z.string().optional(),
    Lead_Status: z.string().optional(),
    Industry: z.string().optional(),
    Annual_Revenue: z.number().optional(),
    No_of_Employees: z.number().optional(),
    Description: z.string().optional(),
    Street: z.string().optional(),
    City: z.string().optional(),
    State: z.string().optional(),
    Zip_Code: z.string().optional(),
    Country: z.string().optional()
});

export type UpdateLeadParams = z.infer<typeof updateLeadSchema>;

/**
 * Operation Definition
 */
export const updateLeadOperation: OperationDefinition = {
    id: "updateLead",
    name: "Update Lead",
    description: "Update an existing lead in Zoho CRM",
    category: "crm",
    inputSchema: updateLeadSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Lead
 */
export async function executeUpdateLead(
    client: ZohoCrmClient,
    params: UpdateLeadParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<ZohoRecordResponse<ZohoLead>>(`/crm/v8/Leads/${id}`, {
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
                message: response.data?.[0]?.message || "Failed to update lead",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update lead",
                retryable: false
            }
        };
    }
}
