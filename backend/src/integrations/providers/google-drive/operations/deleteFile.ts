import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Delete file input schema
 */
export const deleteFileSchema = z.object({
    fileId: z.string().min(1).describe("File or folder ID to delete permanently")
});

export type DeleteFileParams = z.infer<typeof deleteFileSchema>;

/**
 * Delete file operation definition
 */
export const deleteFileOperation: OperationDefinition = {
    id: "deleteFile",
    name: "Delete File Permanently",
    description:
        "Permanently delete a file or folder from Google Drive (cannot be recovered). Use trashFile for soft delete.",
    category: "files",
    retryable: false,
    inputSchema: deleteFileSchema
};

/**
 * Execute delete file operation
 */
export async function executeDeleteFile(
    client: GoogleDriveClient,
    params: DeleteFileParams
): Promise<OperationResult> {
    try {
        await client.deleteFile(params.fileId);

        return {
            success: true,
            data: {
                fileId: params.fileId,
                deleted: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete file",
                retryable: false
            }
        };
    }
}
