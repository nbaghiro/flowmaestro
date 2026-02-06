import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoDeal } from "../types";

/**
 * Batch Update Deals Parameters
 */
export const batchUpdateDealsSchema = z.object({
    deals: z
        .array(
            z.object({
                id: z.string().min(1, "Deal ID is required"),
                Deal_Name: z.string().optional(),
                Account_Name: z.object({ id: z.string() }).optional(),
                Contact_Name: z.object({ id: z.string() }).optional(),
                Amount: z.number().optional(),
                Stage: z.string().optional(),
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

export type BatchUpdateDealsParams = z.infer<typeof batchUpdateDealsSchema>;

/**
 * Operation Definition
 */
export const batchUpdateDealsOperation: OperationDefinition = {
    id: "batchUpdateDeals",
    name: "Batch Update Deals",
    description: "Update multiple deals in Zoho CRM (up to 100 per request)",
    category: "crm",
    inputSchema: batchUpdateDealsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Batch Update Deals
 */
export async function executeBatchUpdateDeals(
    client: ZohoCrmClient,
    params: BatchUpdateDealsParams
): Promise<OperationResult> {
    try {
        const response = await client.put<ZohoRecordResponse<ZohoDeal>>("/crm/v8/Deals", {
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
                message: error instanceof Error ? error.message : "Failed to batch update deals",
                retryable: false
            }
        };
    }
}
