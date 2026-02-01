import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EvernoteClient } from "../client/EvernoteClient";

export const createNotebookSchema = z.object({
    name: z.string().min(1).max(100).describe("Name of the notebook to create"),
    stack: z.string().optional().describe("Optional stack name to group the notebook under")
});

export type CreateNotebookParams = z.infer<typeof createNotebookSchema>;

export const createNotebookOperation: OperationDefinition = {
    id: "createNotebook",
    name: "Create Notebook",
    description: "Create a new notebook in your Evernote account. Optionally assign it to a stack.",
    category: "notebooks",
    actionType: "write",
    inputSchema: createNotebookSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateNotebook(
    client: EvernoteClient,
    params: CreateNotebookParams
): Promise<OperationResult> {
    try {
        const notebook = await client.createNotebook(params.name, params.stack);

        return {
            success: true,
            data: {
                guid: notebook.guid,
                name: notebook.name,
                stack: notebook.stack,
                isDefault: notebook.defaultNotebook,
                createdAt: notebook.serviceCreated
                    ? new Date(notebook.serviceCreated).toISOString()
                    : undefined
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create notebook",
                retryable: false
            }
        };
    }
}
