import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Copy file input schema
 */
export const copyFileSchema = z.object({
    fileId: z.string().min(1).describe("File ID to copy"),
    newName: z
        .string()
        .optional()
        .describe("Name for the copy (optional, defaults to 'Copy of [original name]')"),
    parentFolderId: z.string().optional().describe("Parent folder ID for the copy (optional)")
});

export type CopyFileParams = z.infer<typeof copyFileSchema>;

/**
 * Copy file operation definition
 */
export const copyFileOperation: OperationDefinition = {
    id: "copyFile",
    name: "Copy File in Google Drive",
    description:
        "Create a copy of a file in Google Drive, optionally with a new name and/or location",
    category: "organization",
    retryable: true,
    inputSchema: copyFileSchema
};

/**
 * Execute copy file operation
 */
export async function executeCopyFile(
    client: GoogleDriveClient,
    params: CopyFileParams
): Promise<OperationResult> {
    try {
        const metadata: { name?: string; parents?: string[] } = {};

        if (params.newName) {
            metadata.name = params.newName;
        }

        if (params.parentFolderId) {
            metadata.parents = [params.parentFolderId];
        }

        const response = await client.copyFile(params.fileId, metadata);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to copy file",
                retryable: true
            }
        };
    }
}
