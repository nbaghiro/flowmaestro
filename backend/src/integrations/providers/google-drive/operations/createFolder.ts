import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Create folder input schema
 */
export const createFolderSchema = z.object({
    folderName: z.string().min(1).max(255).describe("Folder name"),
    parentFolderId: z.string().optional().describe("Parent folder ID (omit for root directory)"),
    description: z.string().optional().describe("Folder description")
});

export type CreateFolderParams = z.infer<typeof createFolderSchema>;

/**
 * Create folder operation definition
 */
export const createFolderOperation: OperationDefinition = {
    id: "createFolder",
    name: "Create Folder in Google Drive",
    description: "Create a new folder in Google Drive, optionally within a parent folder",
    category: "folders",
    retryable: true,
    inputSchema: createFolderSchema
};

/**
 * Execute create folder operation
 */
export async function executeCreateFolder(
    client: GoogleDriveClient,
    params: CreateFolderParams
): Promise<OperationResult> {
    try {
        const metadata: {
            name: string;
            mimeType: string;
            parents?: string[];
            description?: string;
        } = {
            name: params.folderName,
            mimeType: "application/vnd.google-apps.folder"
        };

        if (params.parentFolderId) {
            metadata.parents = [params.parentFolderId];
        }

        if (params.description) {
            metadata.description = params.description;
        }

        const response = await client.createFile(metadata);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create folder",
                retryable: true
            }
        };
    }
}
