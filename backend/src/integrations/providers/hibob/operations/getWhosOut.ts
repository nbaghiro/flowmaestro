import { z } from "zod";
import { HiBobClient } from "../client/HiBobClient";
import type { HiBobWhosOutResponse, HiBobWhosOutEntry } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Who's Out operation schema
 */
export const getWhosOutSchema = z.object({
    fromDate: z.string().describe("Start date for the search period (YYYY-MM-DD)"),
    toDate: z.string().describe("End date for the search period (YYYY-MM-DD)"),
    includeHourly: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include hourly time-off (e.g., half days)")
});

export type GetWhosOutParams = z.infer<typeof getWhosOutSchema>;

/**
 * Get Who's Out operation definition
 */
export const getWhosOutOperation: OperationDefinition = {
    id: "getWhosOut",
    name: "Get Who's Out",
    description: "Get a list of employees who are out (on leave) during a specific date range",
    category: "hr",
    inputSchema: getWhosOutSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute get who's out operation
 */
export async function executeGetWhosOut(
    client: HiBobClient,
    params: GetWhosOutParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            from: params.fromDate,
            to: params.toDate
        };

        if (params.includeHourly) {
            queryParams.includeHourly = "true";
        }

        const response = await client.get<HiBobWhosOutResponse>("/timeoff/whosout", queryParams);

        const outEmployees = response.outs.map((entry: HiBobWhosOutEntry) => ({
            employeeId: entry.employeeId,
            employeeDisplayName: entry.employeeDisplayName,
            policyType: entry.policyType,
            policyTypeDisplayName: entry.policyTypeDisplayName,
            startDate: entry.startDate,
            endDate: entry.endDate
        }));

        return {
            success: true,
            data: {
                fromDate: params.fromDate,
                toDate: params.toDate,
                outEmployees,
                total: outEmployees.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get who's out",
                retryable: true
            }
        };
    }
}
