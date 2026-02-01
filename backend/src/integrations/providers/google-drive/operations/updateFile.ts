import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Update file metadata input schema
 */
export const updateFileSchema = z.object({
    fileId: z.string().min(1).describe("File or folder ID to update"),
    name: z.string().optional().describe("New name for the file or folder"),
    description: z.string().optional().describe("New description for the file or folder")
});

export type UpdateFileParams = z.infer<typeof updateFileSchema>;

/**
 * Update file metadata operation definition
 */
export const updateFileOperation: OperationDefinition = {
    id: "updateFile",
    name: "Update File Metadata",
    description: "Update the name and/or description of a file or folder in Google Drive",
    category: "organization",
    retryable: true,
    inputSchema: updateFileSchema
};

/**
 * Execute update file operation
 */
export async function executeUpdateFile(
    client: GoogleDriveClient,
    params: UpdateFileParams
): Promise<OperationResult> {
    try {
        const metadata: { name?: string; description?: string } = {};

        if (params.name) {
            metadata.name = params.name;
        }

        if (params.description) {
            metadata.description = params.description;
        }

        if (Object.keys(metadata).length === 0) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "At least one of name or description must be provided",
                    retryable: false
                }
            };
        }

        const response = await client.updateFile(params.fileId, metadata);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update file metadata",
                retryable: true
            }
        };
    }
}
