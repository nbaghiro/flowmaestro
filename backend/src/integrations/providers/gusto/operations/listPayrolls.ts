import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { GustoClient } from "../client/GustoClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Payrolls operation schema
 */
export const listPayrollsSchema = z.object({
    companyId: z.string().describe("The Gusto company UUID"),
    startDate: z
        .string()
        .optional()
        .describe("Filter payrolls starting on or after this date (YYYY-MM-DD)"),
    endDate: z
        .string()
        .optional()
        .describe("Filter payrolls ending on or before this date (YYYY-MM-DD)"),
    processed: z
        .boolean()
        .optional()
        .describe("Filter by processed status (true for processed only, false for unprocessed)")
});

export type ListPayrollsParams = z.infer<typeof listPayrollsSchema>;

/**
 * List Payrolls operation definition
 */
export const listPayrollsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listPayrolls",
            name: "List Payrolls",
            description: "List payrolls for a company in Gusto",
            category: "hr",
            actionType: "read",
            inputSchema: listPayrollsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Gusto", err: error }, "Failed to create listPayrollsOperation");
        throw new Error(
            `Failed to create listPayrolls operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list payrolls operation
 */
export async function executeListPayrolls(
    client: GustoClient,
    params: ListPayrollsParams
): Promise<OperationResult> {
    try {
        const payrolls = await client.listPayrolls(params.companyId, {
            startDate: params.startDate,
            endDate: params.endDate,
            processed: params.processed
        });

        return {
            success: true,
            data: {
                payrolls: payrolls.map((payroll) => ({
                    uuid: payroll.uuid,
                    companyUuid: payroll.company_uuid,
                    payPeriodStart: payroll.pay_period?.start_date,
                    payPeriodEnd: payroll.pay_period?.end_date,
                    checkDate: payroll.check_date,
                    processed: payroll.processed,
                    payrollDeadline: payroll.payroll_deadline,
                    companyDebit: payroll.totals?.company_debit,
                    netPay: payroll.totals?.net_pay,
                    grossPay: payroll.totals?.gross_pay
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list payrolls",
                retryable: true
            }
        };
    }
}
