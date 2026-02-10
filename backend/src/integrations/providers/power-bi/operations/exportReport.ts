import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PowerBIClient } from "../client/PowerBIClient";

/**
 * Export report input schema
 */
export const exportReportSchema = z.object({
    reportId: z.string().min(1).describe("Report ID (GUID)"),
    workspaceId: z
        .string()
        .optional()
        .describe("Workspace ID (GUID). If not provided, uses 'My Workspace'"),
    format: z.enum(["PDF", "PPTX", "PNG"]).describe("Export format (PDF, PPTX, or PNG)"),
    pages: z
        .array(z.string())
        .optional()
        .describe("Specific page names to export (if not provided, exports all pages)")
});

export type ExportReportParams = z.infer<typeof exportReportSchema>;

/**
 * Export report operation definition
 */
export const exportReportOperation: OperationDefinition = {
    id: "exportReport",
    name: "Export Report",
    description: "Export a report to PDF, PowerPoint, or PNG",
    category: "data",
    retryable: false,
    inputSchema: exportReportSchema
};

/**
 * Execute export report operation
 */
export async function executeExportReport(
    client: PowerBIClient,
    params: ExportReportParams
): Promise<OperationResult> {
    try {
        const response = await client.exportReport({
            reportId: params.reportId,
            workspaceId: params.workspaceId,
            format: params.format,
            pages: params.pages
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to export report",
                retryable: false
            }
        };
    }
}
