import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoDeal } from "../types";

/**
 * Batch Create Deals Parameters
 */
export const batchCreateDealsSchema = z.object({
    deals: z
        .array(
            z.object({
                Deal_Name: z.string().min(1, "Deal name is required"),
                Account_Name: z.object({ id: z.string() }).optional(),
                Contact_Name: z.object({ id: z.string() }).optional(),
                Amount: z.number().optional(),
                Stage: z.string().min(1, "Stage is required"),
                Probability: z.number().min(0).max(100).optional(),
                Closing_Date: z.string().optional(),
                Type: z.string().optional(),
                Lead_Source: z.string().optional(),
                Description: z.string().optional()
            })
        )
        .min(1)
        .max(100, "Maximum 100 deals per batch")
});

export type BatchCreateDealsParams = z.infer<typeof batchCreateDealsSchema>;

/**
 * Operation Definition
 */
export const batchCreateDealsOperation: OperationDefinition = {
    id: "batchCreateDeals",
    name: "Batch Create Deals",
    description: "Create multiple deals in Zoho CRM (up to 100 per request)",
    category: "crm",
    inputSchema: batchCreateDealsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Batch Create Deals
 */
export async function executeBatchCreateDeals(
    client: ZohoCrmClient,
    params: BatchCreateDealsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoRecordResponse<ZohoDeal>>("/crm/v8/Deals", {
            data: params.deals
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
                message: error instanceof Error ? error.message : "Failed to batch create deals",
                retryable: false
            }
        };
    }
}
