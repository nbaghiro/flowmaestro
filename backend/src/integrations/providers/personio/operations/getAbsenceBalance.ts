import { z } from "zod";
import { PersonioClient } from "../client/PersonioClient";
import type { PersonioAbsenceBalanceResponse, PersonioAbsenceBalance } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Absence Balance operation schema
 */
export const getAbsenceBalanceSchema = z.object({
    employeeId: z.number().describe("The unique identifier of the employee"),
    year: z.number().optional().describe("Year for the balance (defaults to current year)")
});

export type GetAbsenceBalanceParams = z.infer<typeof getAbsenceBalanceSchema>;

/**
 * Get Absence Balance operation definition
 */
export const getAbsenceBalanceOperation: OperationDefinition = {
    id: "getAbsenceBalance",
    name: "Get Absence Balance",
    description: "Get the time-off balance for an employee across all leave types",
    category: "hr",
    inputSchema: getAbsenceBalanceSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get absence balance operation
 */
export async function executeGetAbsenceBalance(
    client: PersonioClient,
    params: GetAbsenceBalanceParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string | number> = {};

        if (params.year) {
            queryParams.year = params.year;
        }

        const response = await client.get<PersonioAbsenceBalanceResponse>(
            `/company/employees/${params.employeeId}/absences/balance`,
            queryParams
        );

        const balances = response.data.map((bal: PersonioAbsenceBalance) => ({
            id: bal.id,
            name: bal.name,
            category: bal.category,
            balance: bal.balance,
            used: bal.used,
            available: bal.available
        }));

        return {
            success: true,
            data: {
                employeeId: params.employeeId,
                year: params.year || new Date().getFullYear(),
                balances
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get absence balance";

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
