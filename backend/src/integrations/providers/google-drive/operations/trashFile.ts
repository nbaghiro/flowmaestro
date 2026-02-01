import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Trash file input schema
 */
export const trashFileSchema = z.object({
    fileId: z.string().min(1).describe("File or folder ID to move to trash")
});

export type TrashFileParams = z.infer<typeof trashFileSchema>;

/**
 * Trash file operation definition
 */
export const trashFileOperation: OperationDefinition = {
    id: "trashFile",
    name: "Move File to Trash",
    description:
        "Move a file or folder to trash (soft delete). Files in trash are automatically deleted after 30 days.",
    category: "organization",
    retryable: true,
    inputSchema: trashFileSchema
};

/**
 * Execute trash file operation
 */
export async function executeTrashFile(
    client: GoogleDriveClient,
    params: TrashFileParams
): Promise<OperationResult> {
    try {
        const response = await client.updateFile(params.fileId, {
            trashed: true
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
                message: error instanceof Error ? error.message : "Failed to trash file",
                retryable: true
            }
        };
    }
}
