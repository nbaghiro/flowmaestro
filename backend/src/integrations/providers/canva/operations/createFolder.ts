import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CanvaClient } from "../client/CanvaClient";

export const createFolderOperation: OperationDefinition = {
    id: "createFolder",
    name: "Create Folder",
    description: "Create a new folder in Canva to organize designs",
    category: "folders",
    inputSchema: z.object({
        name: z.string().min(1).describe("Name for the new folder"),
        parentFolderId: z
            .string()
            .optional()
            .describe("Parent folder ID to create this folder under")
    }),
    retryable: false
};

export async function executeCreateFolder(
    client: CanvaClient,
    params: z.infer<typeof createFolderOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.createFolder({
            name: params.name,
            parent_folder_id: params.parentFolderId
        });

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create Canva folder",
                retryable: false
            }
        };
    }
}
