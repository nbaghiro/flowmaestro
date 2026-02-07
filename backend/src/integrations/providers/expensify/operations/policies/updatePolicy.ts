import { z } from "zod";
import { ExpensifyClient } from "../../client/ExpensifyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Update Policy operation schema
 */
export const updatePolicySchema = z.object({
    policyID: z.string().describe("Policy ID to update"),
    name: z.string().optional(),
    outputCurrency: z.string().length(3).optional(),
    maxExpenseAge: z.number().min(0).optional().describe("Maximum expense age in days"),
    maxExpenseAmount: z.number().min(0).optional().describe("Maximum expense amount in cents"),
    autoApproveAmount: z.number().min(0).optional().describe("Auto-approve threshold in cents")
});

export type UpdatePolicyParams = z.infer<typeof updatePolicySchema>;

/**
 * Update Policy operation definition
 */
export const updatePolicyOperation: OperationDefinition = {
    id: "updatePolicy",
    name: "Update Policy",
    description: "Update workspace policy settings",
    category: "policies",
    inputSchema: updatePolicySchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute update policy operation
 */
export async function executeUpdatePolicy(
    client: ExpensifyClient,
    params: UpdatePolicyParams
): Promise<OperationResult> {
    try {
        const inputSettings: Record<string, unknown> = {
            type: "policy",
            policyID: params.policyID
        };

        if (params.name) inputSettings.name = params.name;
        if (params.outputCurrency) inputSettings.outputCurrency = params.outputCurrency;
        if (params.maxExpenseAge !== undefined) inputSettings.maxExpenseAge = params.maxExpenseAge;
        if (params.maxExpenseAmount !== undefined)
            inputSettings.maxExpenseAmount = params.maxExpenseAmount;
        if (params.autoApproveAmount !== undefined) {
            inputSettings.autoApprove = { maxAmount: params.autoApproveAmount };
        }

        const response = await client.executeJob("update", inputSettings);

        return {
            success: true,
            data: {
                policyID: params.policyID,
                updated: true,
                ...response
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update policy";

        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Policy not found",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
