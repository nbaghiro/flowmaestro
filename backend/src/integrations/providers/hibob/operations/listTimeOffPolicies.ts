import { z } from "zod";
import { HiBobClient } from "../client/HiBobClient";
import type { HiBobTimeOffPoliciesResponse, HiBobTimeOffPolicy } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Time Off Policies operation schema
 */
export const listTimeOffPoliciesSchema = z.object({});

export type ListTimeOffPoliciesParams = z.infer<typeof listTimeOffPoliciesSchema>;

/**
 * List Time Off Policies operation definition
 */
export const listTimeOffPoliciesOperation: OperationDefinition = {
    id: "listTimeOffPolicies",
    name: "List Time Off Policies",
    description: "List all time-off policies configured in HiBob",
    category: "hr",
    inputSchema: listTimeOffPoliciesSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute list time off policies operation
 */
export async function executeListTimeOffPolicies(
    client: HiBobClient,
    _params: ListTimeOffPoliciesParams
): Promise<OperationResult> {
    try {
        const response = await client.get<HiBobTimeOffPoliciesResponse>("/timeoff/policies");

        const policies = response.policies.map((policy: HiBobTimeOffPolicy) => ({
            name: policy.name,
            policyType: policy.policyType,
            allowance: policy.allowance,
            unit: policy.unit,
            isUnlimited: policy.isUnlimited,
            accrualPeriod: policy.accrualPeriod
        }));

        return {
            success: true,
            data: {
                policies,
                total: policies.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to list time off policies",
                retryable: true
            }
        };
    }
}
