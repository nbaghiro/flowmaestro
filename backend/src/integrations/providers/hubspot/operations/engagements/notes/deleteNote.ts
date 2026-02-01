import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";

/**
 * Delete Note Parameters
 */
export const deleteNoteSchema = z.object({
    noteId: z.string()
});

export type DeleteNoteParams = z.infer<typeof deleteNoteSchema>;

/**
 * Operation Definition
 */
export const deleteNoteOperation: OperationDefinition = {
    id: "deleteNote",
    name: "Delete Note",
    description: "Delete (archive) a note engagement in HubSpot CRM",
    category: "crm",
    inputSchema: deleteNoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Note
 */
export async function executeDeleteNote(
    client: HubspotClient,
    params: DeleteNoteParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/notes/${params.noteId}`);

        return {
            success: true,
            data: { deleted: true }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete note",
                retryable: false
            }
        };
    }
}
