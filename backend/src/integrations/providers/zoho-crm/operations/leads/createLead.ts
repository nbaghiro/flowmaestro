import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoLead } from "../types";

/**
 * Create Lead Parameters
 */
export const createLeadSchema = z.object({
    Last_Name: z.string().min(1, "Last name is required"),
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

export type CreateLeadParams = z.infer<typeof createLeadSchema>;

/**
 * Operation Definition
 */
export const createLeadOperation: OperationDefinition = {
    id: "createLead",
    name: "Create Lead",
    description: "Create a new lead in Zoho CRM",
    category: "crm",
    inputSchema: createLeadSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Lead
 */
export async function executeCreateLead(
    client: ZohoCrmClient,
    params: CreateLeadParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoRecordResponse<ZohoLead>>("/crm/v8/Leads", {
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
                message: response.data?.[0]?.message || "Failed to create lead",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create lead",
                retryable: false
            }
        };
    }
}
