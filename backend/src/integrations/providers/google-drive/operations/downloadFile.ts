import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Download file input schema
 */
export const downloadFileSchema = z.object({
    fileId: z.string().min(1).describe("File ID to download")
});

export type DownloadFileParams = z.infer<typeof downloadFileSchema>;

/**
 * Download file operation definition
 */
export const downloadFileOperation: OperationDefinition = {
    id: "downloadFile",
    name: "Download File from Google Drive",
    description:
        "Download file content from Google Drive. Note: Use exportDocument for Google Workspace files (Docs, Sheets, Slides)",
    category: "files",
    retryable: true,
    inputSchema: downloadFileSchema
};

/**
 * Execute download file operation
 */
export async function executeDownloadFile(
    client: GoogleDriveClient,
    params: DownloadFileParams
): Promise<OperationResult> {
    try {
        const content = await client.downloadFile(params.fileId);

        // Convert Blob to base64 if possible
        let fileContent: string | Blob = content;

        if (content instanceof Blob) {
            // Convert Blob to base64 for easier handling
            const arrayBuffer = await content.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            fileContent = base64;
        }

        return {
            success: true,
            data: {
                fileId: params.fileId,
                content: fileContent,
                contentType: content.type
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to download file",
                retryable: true
            }
        };
    }
}
