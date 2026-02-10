import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoAccount } from "../types";

/**
 * Get Account Parameters
 */
export const getAccountSchema = z.object({
    id: z.string().min(1, "Account ID is required"),
    fields: z.array(z.string()).optional()
});

export type GetAccountParams = z.infer<typeof getAccountSchema>;

/**
 * Operation Definition
 */
export const getAccountOperation: OperationDefinition = {
    id: "getAccount",
    name: "Get Account",
    description: "Get an account by ID from Zoho CRM",
    category: "crm",
    inputSchema: getAccountSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Account
 */
export async function executeGetAccount(
    client: ZohoCrmClient,
    params: GetAccountParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const response = await client.get<ZohoListResponse<ZohoAccount>>(
            `/crm/v8/Accounts/${params.id}`,
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
                message: "Account not found",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get account",
                retryable: false
            }
        };
    }
}
