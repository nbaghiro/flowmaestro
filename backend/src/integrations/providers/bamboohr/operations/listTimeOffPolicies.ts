import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BambooHRClient } from "../client/BambooHRClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Time Off Policies operation schema
 */
export const listTimeOffPoliciesSchema = z.object({});

export type ListTimeOffPoliciesParams = z.infer<typeof listTimeOffPoliciesSchema>;

/**
 * List Time Off Policies operation definition
 */
export const listTimeOffPoliciesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listTimeOffPolicies",
            name: "List Time Off Policies",
            description: "List all time off policies configured in BambooHR",
            category: "hr",
            actionType: "read",
            inputSchema: listTimeOffPoliciesSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "BambooHR", err: error },
            "Failed to create listTimeOffPoliciesOperation"
        );
        throw new Error(
            `Failed to create listTimeOffPolicies operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list time off policies operation
 */
export async function executeListTimeOffPolicies(
    client: BambooHRClient,
    _params: ListTimeOffPoliciesParams
): Promise<OperationResult> {
    try {
        const response = await client.listTimeOffPolicies();

        return {
            success: true,
            data: {
                policies: response.data.map((policy) => ({
                    id: policy.id,
                    name: policy.name,
                    type: policy.type,
                    accrualType: policy.accrualType,
                    effectiveDate: policy.effectiveDate
                }))
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
