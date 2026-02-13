import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DeelClient } from "../client/DeelClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Time Off Balance operation schema
 */
export const getTimeOffBalanceSchema = z.object({
    personId: z.string().min(1).describe("The unique identifier of the person")
});

export type GetTimeOffBalanceParams = z.infer<typeof getTimeOffBalanceSchema>;

/**
 * Get Time Off Balance operation definition
 */
export const getTimeOffBalanceOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getTimeOffBalance",
            name: "Get Time Off Balance",
            description: "Get time off entitlements and balance for a specific worker",
            category: "hr",
            actionType: "read",
            inputSchema: getTimeOffBalanceSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Deel", err: error },
            "Failed to create getTimeOffBalanceOperation"
        );
        throw new Error(
            `Failed to create getTimeOffBalance operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get time off balance operation
 */
export async function executeGetTimeOffBalance(
    client: DeelClient,
    params: GetTimeOffBalanceParams
): Promise<OperationResult> {
    try {
        const response = await client.getTimeOffBalance(params.personId);

        return {
            success: true,
            data: {
                entitlements: response.data.map((entitlement) => ({
                    personId: entitlement.person_id,
                    personName: entitlement.person_name,
                    policyId: entitlement.policy_id,
                    policyName: entitlement.policy_name,
                    balance: entitlement.balance,
                    unit: entitlement.unit,
                    accrued: entitlement.accrued,
                    used: entitlement.used,
                    pending: entitlement.pending,
                    asOfDate: entitlement.as_of_date
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get time off balance",
                retryable: true
            }
        };
    }
}
