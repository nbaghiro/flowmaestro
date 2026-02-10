import { z } from "zod";
import { ExpensifyClient } from "../../client/ExpensifyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * List Policies operation schema
 */
export const listPoliciesSchema = z.object({
    adminOnly: z.boolean().optional().default(false)
});

export type ListPoliciesParams = z.infer<typeof listPoliciesSchema>;

/**
 * List Policies operation definition
 */
export const listPoliciesOperation: OperationDefinition = {
    id: "listPolicies",
    name: "List Policies",
    description: "List all workspace policies",
    category: "policies",
    inputSchema: listPoliciesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list policies operation
 */
export async function executeListPolicies(
    client: ExpensifyClient,
    params: ListPoliciesParams
): Promise<OperationResult> {
    try {
        const inputSettings: Record<string, unknown> = {
            type: "policyList"
        };

        if (params.adminOnly) {
            inputSettings.adminOnly = true;
        }

        const response = await client.executeJob("get", inputSettings);

        return {
            success: true,
            data: {
                policies: response.policyList || [],
                count: Array.isArray(response.policyList) ? response.policyList.length : 0
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list policies",
                retryable: true
            }
        };
    }
}
