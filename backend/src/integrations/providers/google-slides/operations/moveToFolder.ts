import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleSlidesClient } from "../client/GoogleSlidesClient";

/**
 * Move to folder input schema
 */
export const moveToFolderSchema = z.object({
    presentationId: z.string().min(1).describe("The ID of the presentation to move"),
    folderId: z.string().min(1).describe("The ID of the destination folder")
});

export type MoveToFolderParams = z.infer<typeof moveToFolderSchema>;

/**
 * Move to folder operation definition
 */
export const moveToFolderOperation: OperationDefinition = {
    id: "moveToFolder",
    name: "Move to Folder",
    description: "Move a presentation to a specific Google Drive folder",
    category: "drive",
    retryable: true,
    inputSchema: moveToFolderSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            presentationId: {
                type: "string",
                description: "The ID of the presentation to move"
            },
            folderId: {
                type: "string",
                description: "The ID of the destination folder"
            }
        },
        required: ["presentationId", "folderId"]
    }
};

/**
 * Execute move to folder operation
 */
export async function executeMoveToFolder(
    client: GoogleSlidesClient,
    params: MoveToFolderParams
): Promise<OperationResult> {
    try {
        await client.moveToFolder(params.presentationId, params.folderId);

        return {
            success: true,
            data: {
                moved: true,
                presentationId: params.presentationId,
                folderId: params.folderId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to move presentation",
                retryable: true
            }
        };
    }
}
