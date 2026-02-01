import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * List files input schema
 */
export const listFilesSchema = z.object({
    query: z
        .string()
        .optional()
        .describe(
            "Search query using Drive query syntax (e.g., \"'folderId' in parents and trashed=false\", \"name contains 'report'\")"
        ),
    pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .default(100)
        .describe("Number of files to return (1-1000, default 100)"),
    pageToken: z.string().optional().describe("Token for next page of results"),
    orderBy: z
        .string()
        .optional()
        .describe("Sort order (e.g., 'createdTime desc', 'modifiedTime', 'name')"),
    fields: z.string().optional().describe("Comma-separated list of fields to include in response")
});

export type ListFilesParams = z.infer<typeof listFilesSchema>;

/**
 * List files operation definition
 */
export const listFilesOperation: OperationDefinition = {
    id: "listFiles",
    name: "List Files in Google Drive",
    description: "List or search files and folders in Google Drive with optional filters",
    category: "files",
    retryable: true,
    inputSchema: listFilesSchema
};

/**
 * Execute list files operation
 */
export async function executeListFiles(
    client: GoogleDriveClient,
    params: ListFilesParams
): Promise<OperationResult> {
    try {
        const response = await client.listFiles({
            q: params.query,
            pageSize: params.pageSize || 100,
            pageToken: params.pageToken,
            orderBy: params.orderBy,
            fields:
                params.fields ||
                "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink)"
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
                message: error instanceof Error ? error.message : "Failed to list files",
                retryable: true
            }
        };
    }
}
