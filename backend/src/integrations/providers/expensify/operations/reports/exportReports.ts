import { z } from "zod";
import { ExpensifyClient } from "../../client/ExpensifyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Export Reports operation schema
 */
export const exportReportsSchema = z.object({
    type: z.enum(["csv", "json"]).optional().default("json"),
    startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
    status: z.enum(["Open", "Processing", "Approved", "Reimbursed", "Archived"]).optional(),
    email: z.string().email().optional().describe("Filter by report owner email"),
    policyID: z.string().optional().describe("Filter by policy ID"),
    limit: z.number().min(1).max(500).optional().default(100)
});

export type ExportReportsParams = z.infer<typeof exportReportsSchema>;

/**
 * Export Reports operation definition
 */
export const exportReportsOperation: OperationDefinition = {
    id: "exportReports",
    name: "Export Reports",
    description: "Export expense reports in CSV or JSON format",
    category: "reports",
    inputSchema: exportReportsSchema,
    retryable: true,
    timeout: 60000
};

/**
 * Execute export reports operation
 */
export async function executeExportReports(
    client: ExpensifyClient,
    params: ExportReportsParams
): Promise<OperationResult> {
    try {
        const inputSettings: Record<string, unknown> = {
            type: "combinedReportData",
            limit: String(params.limit)
        };

        if (params.startDate) {
            inputSettings.startDate = params.startDate;
        }
        if (params.endDate) {
            inputSettings.endDate = params.endDate;
        }
        if (params.status) {
            inputSettings.filters = { status: params.status };
        }
        if (params.email) {
            inputSettings.employeeEmail = params.email;
        }
        if (params.policyID) {
            inputSettings.policyID = params.policyID;
        }

        const response = await client.executeJob("file", inputSettings);

        return {
            success: true,
            data: {
                reports: response.reportList || [],
                count: Array.isArray(response.reportList) ? response.reportList.length : 0,
                format: params.type
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to export reports",
                retryable: true
            }
        };
    }
}
