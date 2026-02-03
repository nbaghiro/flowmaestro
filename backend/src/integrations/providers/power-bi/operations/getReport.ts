import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PowerBIClient } from "../client/PowerBIClient";

/**
 * Get report input schema
 */
export const getReportSchema = z.object({
    reportId: z.string().min(1).describe("Report ID (GUID)"),
    workspaceId: z
        .string()
        .optional()
        .describe("Workspace ID (GUID). If not provided, looks in 'My Workspace'")
});

export type GetReportParams = z.infer<typeof getReportSchema>;

/**
 * Get report operation definition
 */
export const getReportOperation: OperationDefinition = {
    id: "getReport",
    name: "Get Report",
    description: "Get details of a specific report",
    category: "data",
    retryable: true,
    inputSchema: getReportSchema
};

/**
 * Execute get report operation
 */
export async function executeGetReport(
    client: PowerBIClient,
    params: GetReportParams
): Promise<OperationResult> {
    try {
        const response = await client.getReport(params.reportId, params.workspaceId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get report",
                retryable: true
            }
        };
    }
}
