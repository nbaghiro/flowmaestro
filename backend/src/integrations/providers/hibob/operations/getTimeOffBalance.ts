import { z } from "zod";
import { HiBobClient } from "../client/HiBobClient";
import type { HiBobTimeOffBalanceResponse, HiBobTimeOffBalance } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Time Off Balance operation schema
 */
export const getTimeOffBalanceSchema = z.object({
    employeeId: z.string().min(1).describe("The unique identifier of the employee"),
    policyType: z.string().optional().describe("Filter by specific policy type (e.g., 'holiday')")
});

export type GetTimeOffBalanceParams = z.infer<typeof getTimeOffBalanceSchema>;

/**
 * Get Time Off Balance operation definition
 */
export const getTimeOffBalanceOperation: OperationDefinition = {
    id: "getTimeOffBalance",
    name: "Get Time Off Balance",
    description: "Get the time-off balance for an employee across all or specific policies",
    category: "hr",
    inputSchema: getTimeOffBalanceSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get time off balance operation
 */
export async function executeGetTimeOffBalance(
    client: HiBobClient,
    params: GetTimeOffBalanceParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.policyType) {
            queryParams.policyType = params.policyType;
        }

        const response = await client.get<HiBobTimeOffBalanceResponse>(
            `/timeoff/employees/${encodeURIComponent(params.employeeId)}/balance`,
            queryParams
        );

        const balances = response.balances.map((bal: HiBobTimeOffBalance) => ({
            employeeId: bal.employeeId,
            policyType: bal.policyType,
            policyTypeDisplayName: bal.policyTypeDisplayName,
            balance: bal.balance,
            used: bal.used,
            pending: bal.pending,
            available: bal.available,
            startingBalance: bal.startingBalance,
            accrued: bal.accrued,
            adjustments: bal.adjustments
        }));

        return {
            success: true,
            data: {
                employeeId: params.employeeId,
                balances
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get time off balance";

        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Employee not found: ${params.employeeId}`,
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
