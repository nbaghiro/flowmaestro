import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoAccount } from "../types";

/**
 * Update Account Parameters
 */
export const updateAccountSchema = z.object({
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
});

export type UpdateAccountParams = z.infer<typeof updateAccountSchema>;

/**
 * Operation Definition
 */
export const updateAccountOperation: OperationDefinition = {
    id: "updateAccount",
    name: "Update Account",
    description: "Update an existing account in Zoho CRM",
    category: "crm",
    inputSchema: updateAccountSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Account
 */
export async function executeUpdateAccount(
    client: ZohoCrmClient,
    params: UpdateAccountParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<ZohoRecordResponse<ZohoAccount>>(
            `/crm/v8/Accounts/${id}`,
            {
                data: [updateData]
            }
        );

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
                message: response.data?.[0]?.message || "Failed to update account",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update account",
                retryable: false
            }
        };
    }
}
