import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoDeal } from "../types";

/**
 * Update Deal Parameters
 */
export const updateDealSchema = z.object({
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
});

export type UpdateDealParams = z.infer<typeof updateDealSchema>;

/**
 * Operation Definition
 */
export const updateDealOperation: OperationDefinition = {
    id: "updateDeal",
    name: "Update Deal",
    description: "Update an existing deal in Zoho CRM",
    category: "crm",
    inputSchema: updateDealSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Deal
 */
export async function executeUpdateDeal(
    client: ZohoCrmClient,
    params: UpdateDealParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<ZohoRecordResponse<ZohoDeal>>(`/crm/v8/Deals/${id}`, {
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
                message: response.data?.[0]?.message || "Failed to update deal",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update deal",
                retryable: false
            }
        };
    }
}
