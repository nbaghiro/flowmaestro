import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { ZohoCrmClient } from "../../../client/ZohoCrmClient";
import type { ZohoDeleteResponse } from "../../types";

/**
 * Delete Note Parameters
 */
export const deleteNoteSchema = z.object({
    id: z.string().min(1, "Note ID is required")
});

export type DeleteNoteParams = z.infer<typeof deleteNoteSchema>;

/**
 * Operation Definition
 */
export const deleteNoteOperation: OperationDefinition = {
    id: "deleteNote",
    name: "Delete Note",
    description: "Delete a note from Zoho CRM",
    category: "crm",
    inputSchema: deleteNoteSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Note
 */
export async function executeDeleteNote(
    client: ZohoCrmClient,
    params: DeleteNoteParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<ZohoDeleteResponse>(`/crm/v8/Notes?ids=${params.id}`);

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: {
                    deleted: true,
                    noteId: params.id
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to delete note",
                retryable: false
            }
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
