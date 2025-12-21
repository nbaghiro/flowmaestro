import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDocsClient } from "../client/GoogleDocsClient";

/**
 * Move to folder input schema
 */
export const moveToFolderSchema = z.object({
    documentId: z.string().min(1).describe("The ID of the document to move"),
    folderId: z.string().min(1).describe("The ID of the destination Google Drive folder")
});

export type MoveToFolderParams = z.infer<typeof moveToFolderSchema>;

/**
 * Move to folder operation definition
 */
export const moveToFolderOperation: OperationDefinition = {
    id: "moveToFolder",
    name: "Move to Folder",
    description: "Move a Google Docs document to a specific Google Drive folder",
    category: "documents",
    retryable: true,
    inputSchema: moveToFolderSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {
            documentId: {
                type: "string",
                description: "The ID of the document to move"
            },
            folderId: {
                type: "string",
                description: "The ID of the destination Google Drive folder"
            }
        },
        required: ["documentId", "folderId"]
    }
};

/**
 * Execute move to folder operation
 * Uses Drive API to move the document
 */
export async function executeMoveToFolder(
    client: GoogleDocsClient,
    params: MoveToFolderParams
): Promise<OperationResult> {
    try {
        await client.moveToFolder(params.documentId, params.folderId);

        return {
            success: true,
            data: {
                documentId: params.documentId,
                folderId: params.folderId,
                moved: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to move document",
                retryable: true
            }
        };
    }
}
