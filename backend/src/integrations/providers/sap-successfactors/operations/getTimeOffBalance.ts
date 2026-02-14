import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SAPSuccessFactorsClient } from "../client/SAPSuccessFactorsClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Time Off Balance operation schema
 */
export const getTimeOffBalanceSchema = z.object({
    userId: z.string().min(1).describe("The user ID to get time off balance for"),
    top: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of balance records to return"),
    skip: z.number().min(0).optional().describe("Number of results to skip for pagination")
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
            description: "Get time off account balances for a specific employee",
            category: "hr",
            actionType: "read",
            inputSchema: getTimeOffBalanceSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "SAPSuccessFactors", err: error },
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
    client: SAPSuccessFactorsClient,
    params: GetTimeOffBalanceParams
): Promise<OperationResult> {
    try {
        const response = await client.getTimeOffBalance({
            userId: params.userId,
            top: params.top,
            skip: params.skip
        });

        const balances = response.d.results.map((balance) => ({
            id: balance.externalCode,
            userId: balance.userId,
            accountId: balance.timeAccount,
            accountName: balance.timeAccountName,
            balance: balance.balance,
            unit: balance.unit,
            asOfDate: balance.asOfDate,
            approved: balance.approved,
            pending: balance.pending
        }));

        const total = response.d.__count ? parseInt(response.d.__count, 10) : null;
        const hasMore = !!response.d.__next;

        return {
            success: true,
            data: {
                balances,
                pagination: {
                    total,
                    top: params.top || 100,
                    skip: params.skip || 0,
                    hasMore,
                    nextLink: response.d.__next || null
                }
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
