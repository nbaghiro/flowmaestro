import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Upload file input schema
 */
export const uploadFileSchema = z.object({
    fileName: z.string().min(1).max(255).describe("File name"),
    fileContent: z
        .string()
        .describe("Base64 encoded file content or data URL (e.g., data:image/png;base64,...)"),
    mimeType: z.string().describe("MIME type of the file (e.g., image/png, application/pdf)"),
    folderId: z.string().optional().describe("Parent folder ID (omit for root directory)"),
    description: z.string().optional().describe("File description")
});

export type UploadFileParams = z.infer<typeof uploadFileSchema>;

/**
 * Upload file operation definition
 */
export const uploadFileOperation: OperationDefinition = {
    id: "uploadFile",
    name: "Upload File to Google Drive",
    description: "Upload a file to Google Drive, optionally to a specific folder",
    category: "files",
    retryable: true,
    inputSchema: uploadFileSchema
};

/**
 * Execute upload file operation
 */
export async function executeUploadFile(
    client: GoogleDriveClient,
    params: UploadFileParams
): Promise<OperationResult> {
    try {
        const response = await client.uploadFile({
            fileName: params.fileName,
            fileContent: params.fileContent,
            mimeType: params.mimeType,
            folderId: params.folderId,
            description: params.description
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
                message: error instanceof Error ? error.message : "Failed to upload file",
                retryable: true
            }
        };
    }
}
