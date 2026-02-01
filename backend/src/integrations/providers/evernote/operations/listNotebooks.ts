import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EvernoteClient } from "../client/EvernoteClient";

export const listNotebooksSchema = z.object({});

export type ListNotebooksParams = z.infer<typeof listNotebooksSchema>;

export const listNotebooksOperation: OperationDefinition = {
    id: "listNotebooks",
    name: "List Notebooks",
    description:
        "List all notebooks in your Evernote account. Returns notebook names, GUIDs, and metadata.",
    category: "notebooks",
    actionType: "read",
    inputSchema: listNotebooksSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListNotebooks(
    client: EvernoteClient,
    _params: ListNotebooksParams
): Promise<OperationResult> {
    try {
        const notebooks = await client.listNotebooks();

        // Transform to cleaner format
        const items = notebooks.map((notebook) => ({
            guid: notebook.guid,
            name: notebook.name,
            isDefault: notebook.defaultNotebook,
            stack: notebook.stack,
            createdAt: notebook.serviceCreated
                ? new Date(notebook.serviceCreated).toISOString()
                : undefined,
            updatedAt: notebook.serviceUpdated
                ? new Date(notebook.serviceUpdated).toISOString()
                : undefined
        }));

        return {
            success: true,
            data: {
                notebookCount: items.length,
                notebooks: items
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list notebooks",
                retryable: true
            }
        };
    }
}
