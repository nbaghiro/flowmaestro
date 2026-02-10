import { z } from "zod";
import { ExpensifyClient } from "../../client/ExpensifyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Get Report operation schema
 */
export const getReportSchema = z.object({
    reportID: z.string().describe("Report ID")
});

export type GetReportParams = z.infer<typeof getReportSchema>;

/**
 * Get Report operation definition
 */
export const getReportOperation: OperationDefinition = {
    id: "getReport",
    name: "Get Report",
    description: "Get a specific expense report by ID",
    category: "reports",
    inputSchema: getReportSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get report operation
 */
export async function executeGetReport(
    client: ExpensifyClient,
    params: GetReportParams
): Promise<OperationResult> {
    try {
        const inputSettings = {
            type: "combinedReportData",
            filters: {
                reportIDList: params.reportID
            }
        };

        const response = await client.executeJob("file", inputSettings);

        const reports = response.reportList as unknown[];
        if (!reports || reports.length === 0) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Report not found",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: reports[0]
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get report";

        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Report not found",
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
