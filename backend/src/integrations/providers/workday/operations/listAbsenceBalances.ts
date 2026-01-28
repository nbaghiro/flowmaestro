import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { WorkdayClient } from "../client/WorkdayClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Absence Balances operation schema
 */
export const listAbsenceBalancesSchema = z.object({
    workerId: z
        .string()
        .optional()
        .describe("Filter by specific worker ID. If not provided, returns all balances.")
});

export type ListAbsenceBalancesParams = z.infer<typeof listAbsenceBalancesSchema>;

/**
 * List Absence Balances operation definition
 */
export const listAbsenceBalancesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listAbsenceBalances",
            name: "List Absence Balances",
            description: "Get time-off balances for workers, optionally filtered by worker ID",
            category: "hr",
            actionType: "read",
            inputSchema: listAbsenceBalancesSchema,
            inputSchemaJSON: toJSONSchema(listAbsenceBalancesSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Workday", err: error },
            "Failed to create listAbsenceBalancesOperation"
        );
        throw new Error(
            `Failed to create listAbsenceBalances operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list absence balances operation
 */
export async function executeListAbsenceBalances(
    client: WorkdayClient,
    params: ListAbsenceBalancesParams
): Promise<OperationResult> {
    try {
        const response = await client.listAbsenceBalances({
            workerId: params.workerId
        });

        return {
            success: true,
            data: {
                absenceBalances: response.data.map((balance) => ({
                    workerId: balance.workerId,
                    workerName: balance.workerName,
                    timeOffPlanId: balance.timeOffPlanId,
                    timeOffPlanName: balance.timeOffPlanName,
                    balance: balance.balance,
                    unit: balance.unit,
                    asOfDate: balance.asOfDate
                })),
                pagination: {
                    total: response.total,
                    offset: response.offset,
                    limit: response.limit
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list absence balances",
                retryable: true
            }
        };
    }
}
