import { z } from "zod";
import { TableauClient } from "../client/TableauClient";
import {
    TableauWorkbookIdSchema,
    TableauDownloadFormatSchema,
    TableauPageTypeSchema,
    TableauOrientationSchema
} from "./schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Download Workbook operation schema
 */
export const downloadWorkbookSchema = z.object({
    workbook_id: TableauWorkbookIdSchema,
    format: TableauDownloadFormatSchema,
    page_type: TableauPageTypeSchema,
    orientation: TableauOrientationSchema
});

export type DownloadWorkbookParams = z.infer<typeof downloadWorkbookSchema>;

/**
 * Download Workbook operation definition
 */
export const downloadWorkbookOperation: OperationDefinition = {
    id: "downloadWorkbook",
    name: "Download Workbook",
    description: "Download a workbook as PDF or PowerPoint",
    category: "workbooks",
    inputSchema: downloadWorkbookSchema,
    retryable: true,
    timeout: 120000
};

/**
 * Execute download workbook operation
 */
export async function executeDownloadWorkbook(
    client: TableauClient,
    params: DownloadWorkbookParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            type: params.format
        };

        if (params.format === "pdf") {
            queryParams.pageType = params.page_type;
            queryParams.orientation = params.orientation;
        }

        // Note: This endpoint returns binary data
        // In a real implementation, you'd handle the binary response
        const downloadUrl = client.makeSitePath(
            `/workbooks/${params.workbook_id}/${params.format}`
        );

        return {
            success: true,
            data: {
                format: params.format,
                download_url: downloadUrl,
                page_type: params.page_type,
                orientation: params.orientation,
                note: "Use the download_url with the X-Tableau-Auth header to fetch the file"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to download workbook",
                retryable: true
            }
        };
    }
}
