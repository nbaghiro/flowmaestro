import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoLead } from "../types";

/**
 * Batch Create Leads Parameters
 */
export const batchCreateLeadsSchema = z.object({
    leads: z
        .array(
            z.object({
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
            })
        )
        .min(1)
        .max(100, "Maximum 100 leads per batch")
});

export type BatchCreateLeadsParams = z.infer<typeof batchCreateLeadsSchema>;

/**
 * Operation Definition
 */
export const batchCreateLeadsOperation: OperationDefinition = {
    id: "batchCreateLeads",
    name: "Batch Create Leads",
    description: "Create multiple leads in Zoho CRM (up to 100 per request)",
    category: "crm",
    inputSchema: batchCreateLeadsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Batch Create Leads
 */
export async function executeBatchCreateLeads(
    client: ZohoCrmClient,
    params: BatchCreateLeadsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoRecordResponse<ZohoLead>>("/crm/v8/Leads", {
            data: params.leads
        });

        const results = response.data.map((item, index) => ({
            index,
            success: item.status === "success",
            data: item.details,
            code: item.code,
            message: item.message
        }));

        const successCount = results.filter((r) => r.success).length;

        return {
            success: successCount > 0,
            data: {
                results,
                successCount,
                failureCount: results.length - successCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to batch create leads",
                retryable: false
            }
        };
    }
}
