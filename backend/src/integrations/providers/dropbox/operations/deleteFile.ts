import { z } from "zod";
import { DropboxClient } from "../client/DropboxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const deleteFileSchema = z.object({
    path: z
        .string()
        .describe(
            'Full path to the file or folder to delete (e.g., "/Documents/old-file.pdf" or "/Documents/OldFolder")'
        )
});

export type DeleteFileParams = z.infer<typeof deleteFileSchema>;

export const deleteFileOperation: OperationDefinition = {
    id: "deleteFile",
    name: "Delete File or Folder",
    description:
        "Delete a file or folder from Dropbox. This moves the item to trash (can be recovered within retention period). Returns metadata of the deleted item.",
    category: "files",
    inputSchema: deleteFileSchema,
    retryable: false, // Deletion should not be retried automatically
    timeout: 10000
};

interface DropboxDeleteResponse {
    metadata: {
        ".tag": "file" | "folder";
        name: string;
        path_lower: string;
        path_display: string;
        id: string;
    };
}

export async function executeDeleteFile(
    client: DropboxClient,
    params: DeleteFileParams
): Promise<OperationResult> {
    try {
        const response = (await client.deleteFile(params.path)) as DropboxDeleteResponse;

        return {
            success: true,
            data: {
                deleted: true,
                type: response.metadata[".tag"],
                id: response.metadata.id,
                name: response.metadata.name,
                path: response.metadata.path_display
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
