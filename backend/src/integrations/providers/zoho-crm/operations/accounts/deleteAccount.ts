import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoDeleteResponse } from "../types";

/**
 * Delete Account Parameters
 */
export const deleteAccountSchema = z.object({
    id: z.string().min(1, "Account ID is required")
});

export type DeleteAccountParams = z.infer<typeof deleteAccountSchema>;

/**
 * Operation Definition
 */
export const deleteAccountOperation: OperationDefinition = {
    id: "deleteAccount",
    name: "Delete Account",
    description: "Delete an account from Zoho CRM",
    category: "crm",
    inputSchema: deleteAccountSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Account
 */
export async function executeDeleteAccount(
    client: ZohoCrmClient,
    params: DeleteAccountParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<ZohoDeleteResponse>(
            `/crm/v8/Accounts?ids=${params.id}`
        );

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: {
                    deleted: true,
                    accountId: params.id
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to delete account",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete account",
                retryable: false
            }
        };
    }
}
