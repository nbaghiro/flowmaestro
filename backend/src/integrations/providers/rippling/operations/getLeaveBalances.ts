import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { RipplingClient } from "../client/RipplingClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Leave Balances operation schema
 */
export const getLeaveBalancesSchema = z.object({
    employeeId: z
        .string()
        .optional()
        .describe("Filter by specific employee ID. If not provided, returns all balances.")
});

export type GetLeaveBalancesParams = z.infer<typeof getLeaveBalancesSchema>;

/**
 * Get Leave Balances operation definition
 */
export const getLeaveBalancesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getLeaveBalances",
            name: "Get Leave Balances",
            description: "Get leave balances for employees, optionally filtered by employee ID",
            category: "hr",
            actionType: "read",
            inputSchema: getLeaveBalancesSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Rippling", err: error },
            "Failed to create getLeaveBalancesOperation"
        );
        throw new Error(
            `Failed to create getLeaveBalances operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get leave balances operation
 */
export async function executeGetLeaveBalances(
    client: RipplingClient,
    params: GetLeaveBalancesParams
): Promise<OperationResult> {
    try {
        const response = await client.getLeaveBalances({
            employeeId: params.employeeId
        });

        return {
            success: true,
            data: {
                leaveBalances: response.data.map((balance) => ({
                    employeeId: balance.employeeId,
                    employeeName: balance.employeeName,
                    policyId: balance.policyId,
                    policyName: balance.policyName,
                    balance: balance.balance,
                    unit: balance.unit,
                    accrued: balance.accrued,
                    used: balance.used,
                    pending: balance.pending,
                    asOfDate: balance.asOfDate
                })),
                pagination: {
                    total: response.pagination.total,
                    limit: response.pagination.limit,
                    offset: response.pagination.offset,
                    hasMore: response.pagination.hasMore
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get leave balances",
                retryable: true
            }
        };
    }
}
