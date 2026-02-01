import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Move file input schema
 */
export const moveFileSchema = z.object({
    fileId: z.string().min(1).describe("File or folder ID to move"),
    newFolderId: z.string().min(1).describe("New parent folder ID"),
    oldFolderId: z.string().min(1).describe("Current parent folder ID")
});

export type MoveFileParams = z.infer<typeof moveFileSchema>;

/**
 * Move file operation definition
 */
export const moveFileOperation: OperationDefinition = {
    id: "moveFile",
    name: "Move File to Different Folder",
    description: "Move a file or folder from one folder to another in Google Drive",
    category: "organization",
    retryable: true,
    inputSchema: moveFileSchema
};

/**
 * Execute move file operation
 */
export async function executeMoveFile(
    client: GoogleDriveClient,
    params: MoveFileParams
): Promise<OperationResult> {
    try {
        const response = await client.moveFile(
            params.fileId,
            params.newFolderId,
            params.oldFolderId
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
                message: error instanceof Error ? error.message : "Failed to move file",
                retryable: true
            }
        };
    }
}
