import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Get file metadata input schema
 */
export const getFileSchema = z.object({
    fileId: z.string().min(1).describe("File ID"),
    fields: z
        .string()
        .optional()
        .describe(
            "Comma-separated list of fields to include (e.g., 'id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink')"
        )
});

export type GetFileParams = z.infer<typeof getFileSchema>;

/**
 * Get file metadata operation definition
 */
export const getFileOperation: OperationDefinition = {
    id: "getFile",
    name: "Get File Metadata",
    description: "Get metadata for a specific file or folder in Google Drive",
    category: "files",
    retryable: true,
    inputSchema: getFileSchema
};

/**
 * Execute get file operation
 */
export async function executeGetFile(
    client: GoogleDriveClient,
    params: GetFileParams
): Promise<OperationResult> {
    try {
        const response = await client.getFile(
            params.fileId,
            params.fields || "id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink"
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get file metadata",
                retryable: true
            }
        };
    }
}
