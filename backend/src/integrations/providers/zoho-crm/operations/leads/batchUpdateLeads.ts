import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoLead } from "../types";

/**
 * Batch Update Leads Parameters
 */
export const batchUpdateLeadsSchema = z.object({
    leads: z
        .array(
            z.object({
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
            })
        )
        .min(1)
        .max(100, "Maximum 100 leads per batch")
});

export type BatchUpdateLeadsParams = z.infer<typeof batchUpdateLeadsSchema>;

/**
 * Operation Definition
 */
export const batchUpdateLeadsOperation: OperationDefinition = {
    id: "batchUpdateLeads",
    name: "Batch Update Leads",
    description: "Update multiple leads in Zoho CRM (up to 100 per request)",
    category: "crm",
    inputSchema: batchUpdateLeadsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Batch Update Leads
 */
export async function executeBatchUpdateLeads(
    client: ZohoCrmClient,
    params: BatchUpdateLeadsParams
): Promise<OperationResult> {
    try {
        const response = await client.put<ZohoRecordResponse<ZohoLead>>("/crm/v8/Leads", {
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
                message: error instanceof Error ? error.message : "Failed to batch update leads",
                retryable: false
            }
        };
    }
}
