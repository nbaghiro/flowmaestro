import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { ADPClient } from "../client/ADPClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Pay Statements operation schema
 */
export const listPayStatementsSchema = z.object({
    associateOID: z.string().describe("The ADP associate OID of the worker"),
    startDate: z.string().optional().describe("Filter by start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("Filter by end date (YYYY-MM-DD)")
});

export type ListPayStatementsParams = z.infer<typeof listPayStatementsSchema>;

/**
 * List Pay Statements operation definition
 */
export const listPayStatementsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listPayStatements",
            name: "List Pay Statements",
            description: "List pay statements for a specific worker in ADP",
            category: "hr",
            actionType: "read",
            inputSchema: listPayStatementsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "ADP", err: error },
            "Failed to create listPayStatementsOperation"
        );
        throw new Error(
            `Failed to create listPayStatements operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list pay statements operation
 */
export async function executeListPayStatements(
    client: ADPClient,
    params: ListPayStatementsParams
): Promise<OperationResult> {
    try {
        const response = await client.listPayStatements(params.associateOID, {
            startDate: params.startDate,
            endDate: params.endDate
        });

        const statements = response.payStatements || [];

        return {
            success: true,
            data: {
                payStatements: statements.map((stmt) => ({
                    id: stmt.payStatementID,
                    payDate: stmt.payDate,
                    periodStart: stmt.payPeriod?.startDate,
                    periodEnd: stmt.payPeriod?.endDate,
                    grossPay: stmt.grossPayAmount?.amountValue,
                    netPay: stmt.netPayAmount?.amountValue,
                    currency: stmt.grossPayAmount?.currencyCode
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list pay statements",
                retryable: true
            }
        };
    }
}
