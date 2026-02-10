import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoAccount } from "../types";

/**
 * Create Account Parameters
 */
export const createAccountSchema = z.object({
    Account_Name: z.string().min(1, "Account name is required"),
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

export type CreateAccountParams = z.infer<typeof createAccountSchema>;

/**
 * Operation Definition
 */
export const createAccountOperation: OperationDefinition = {
    id: "createAccount",
    name: "Create Account",
    description: "Create a new account in Zoho CRM",
    category: "crm",
    inputSchema: createAccountSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Account
 */
export async function executeCreateAccount(
    client: ZohoCrmClient,
    params: CreateAccountParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoRecordResponse<ZohoAccount>>("/crm/v8/Accounts", {
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
                message: response.data?.[0]?.message || "Failed to create account",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create account",
                retryable: false
            }
        };
    }
}
