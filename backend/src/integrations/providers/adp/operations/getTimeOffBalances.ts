import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { ADPClient } from "../client/ADPClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Time Off Balances operation schema
 */
export const getTimeOffBalancesSchema = z.object({
    associateOID: z.string().describe("The ADP associate OID of the worker")
});

export type GetTimeOffBalancesParams = z.infer<typeof getTimeOffBalancesSchema>;

/**
 * Get Time Off Balances operation definition
 */
export const getTimeOffBalancesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getTimeOffBalances",
            name: "Get Time Off Balances",
            description: "Get time off balances for a specific worker in ADP",
            category: "hr",
            actionType: "read",
            inputSchema: getTimeOffBalancesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ADP", err: error },
            "Failed to create getTimeOffBalancesOperation"
        );
        throw new Error(
            `Failed to create getTimeOffBalances operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get time off balances operation
 */
export async function executeGetTimeOffBalances(
    client: ADPClient,
    params: GetTimeOffBalancesParams
): Promise<OperationResult> {
    try {
        const response = await client.getTimeOffBalances(params.associateOID);

        const balances = response.timeOffBalances || [];

        return {
            success: true,
            data: {
                balances: balances.map((balance) => ({
                    policyCode: balance.timeOffPolicyCode?.codeValue,
                    policyName: balance.timeOffPolicyCode?.shortName,
                    asOfDate: balance.balanceAsOfDate,
                    balance: balance.balanceQuantity,
                    used: balance.usedQuantity,
                    planned: balance.plannedQuantity,
                    unit: balance.unitCode
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get time off balances",
                retryable: true
            }
        };
    }
}
