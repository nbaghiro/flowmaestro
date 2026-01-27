import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const listMailFoldersSchema = z.object({});

export type ListMailFoldersParams = z.infer<typeof listMailFoldersSchema>;

export const listMailFoldersOperation: OperationDefinition = {
    id: "listMailFolders",
    name: "List Mail Folders",
    description: "List all mail folders in the user's mailbox",
    category: "email",
    inputSchema: listMailFoldersSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {}
    },
    retryable: true
};

export async function executeListMailFolders(
    client: MicrosoftOutlookClient,
    _params: ListMailFoldersParams
): Promise<OperationResult> {
    try {
        const result = await client.listMailFolders();
        return {
            success: true,
            data: {
                folders: result.value.map((folder) => ({
                    id: folder.id,
                    displayName: folder.displayName,
                    parentFolderId: folder.parentFolderId,
                    childFolderCount: folder.childFolderCount,
                    unreadItemCount: folder.unreadItemCount,
                    totalItemCount: folder.totalItemCount
                })),
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list mail folders",
                retryable: true
            }
        };
    }
}
