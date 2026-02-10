import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoAccount } from "../types";

/**
 * Batch Update Accounts Parameters
 */
export const batchUpdateAccountsSchema = z.object({
    accounts: z
        .array(
            z.object({
                id: z.string().min(1, "Account ID is required"),
                Account_Name: z.string().optional(),
                Website: z.string().url().optional(),
                Phone: z.string().optional(),
                Account_Type: z.string().optional(),
                Industry: z.string().optional(),
                Annual_Revenue: z.number().optional(),
                Employees: z.number().optional(),
                Description: z.string().optional(),
                Billing_Street: z.string().optional(),
                Billing_City: z.string().optional(),
                Billing_State: z.string().optional(),
                Billing_Code: z.string().optional(),
                Billing_Country: z.string().optional()
            })
        )
        .min(1)
        .max(100, "Maximum 100 accounts per batch")
});

export type BatchUpdateAccountsParams = z.infer<typeof batchUpdateAccountsSchema>;

/**
 * Operation Definition
 */
export const batchUpdateAccountsOperation: OperationDefinition = {
    id: "batchUpdateAccounts",
    name: "Batch Update Accounts",
    description: "Update multiple accounts in Zoho CRM (up to 100 per request)",
    category: "crm",
    inputSchema: batchUpdateAccountsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Batch Update Accounts
 */
export async function executeBatchUpdateAccounts(
    client: ZohoCrmClient,
    params: BatchUpdateAccountsParams
): Promise<OperationResult> {
    try {
        const response = await client.put<ZohoRecordResponse<ZohoAccount>>("/crm/v8/Accounts", {
            data: params.accounts
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
                message: error instanceof Error ? error.message : "Failed to batch update accounts",
                retryable: false
            }
        };
    }
}
