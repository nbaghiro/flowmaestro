import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoDeal } from "../types";

/**
 * Get Deal Parameters
 */
export const getDealSchema = z.object({
    id: z.string().min(1, "Deal ID is required"),
    fields: z.array(z.string()).optional()
});

export type GetDealParams = z.infer<typeof getDealSchema>;

/**
 * Operation Definition
 */
export const getDealOperation: OperationDefinition = {
    id: "getDeal",
    name: "Get Deal",
    description: "Get a deal by ID from Zoho CRM",
    category: "crm",
    inputSchema: getDealSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Deal
 */
export async function executeGetDeal(
    client: ZohoCrmClient,
    params: GetDealParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const response = await client.get<ZohoListResponse<ZohoDeal>>(
            `/crm/v8/Deals/${params.id}`,
            queryParams
        );

        if (response.data?.[0]) {
            return {
                success: true,
                data: response.data[0]
            };
        }

        return {
            success: false,
            error: {
                type: "not_found",
                message: "Deal not found",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get deal",
                retryable: false
            }
        };
    }
}
