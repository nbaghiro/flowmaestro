import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoDeal } from "../types";

/**
 * Create Deal Parameters
 */
export const createDealSchema = z.object({
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
});

export type CreateDealParams = z.infer<typeof createDealSchema>;

/**
 * Operation Definition
 */
export const createDealOperation: OperationDefinition = {
    id: "createDeal",
    name: "Create Deal",
    description: "Create a new deal in Zoho CRM",
    category: "crm",
    inputSchema: createDealSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Deal
 */
export async function executeCreateDeal(
    client: ZohoCrmClient,
    params: CreateDealParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoRecordResponse<ZohoDeal>>("/crm/v8/Deals", {
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
                message: response.data?.[0]?.message || "Failed to create deal",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create deal",
                retryable: false
            }
        };
    }
}
