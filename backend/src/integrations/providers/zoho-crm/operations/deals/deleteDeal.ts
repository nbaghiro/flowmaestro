import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoDeleteResponse } from "../types";

/**
 * Delete Deal Parameters
 */
export const deleteDealSchema = z.object({
    id: z.string().min(1, "Deal ID is required")
});

export type DeleteDealParams = z.infer<typeof deleteDealSchema>;

/**
 * Operation Definition
 */
export const deleteDealOperation: OperationDefinition = {
    id: "deleteDeal",
    name: "Delete Deal",
    description: "Delete a deal from Zoho CRM",
    category: "crm",
    inputSchema: deleteDealSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Deal
 */
export async function executeDeleteDeal(
    client: ZohoCrmClient,
    params: DeleteDealParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<ZohoDeleteResponse>(`/crm/v8/Deals?ids=${params.id}`);

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: {
                    deleted: true,
                    dealId: params.id
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to delete deal",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete deal",
                retryable: false
            }
        };
    }
}
