import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseNote } from "../types";

/**
 * Create Note Parameters
 */
export const createNoteSchema = z.object({
    lead_id: z.string().describe("Lead ID to add note to (required)"),
    note: z.string().min(1).describe("Note content (required)")
});

export type CreateNoteParams = z.infer<typeof createNoteSchema>;

/**
 * Operation Definition
 */
export const createNoteOperation: OperationDefinition = {
    id: "createNote",
    name: "Create Note",
    description: "Add a note to a lead",
    category: "activities",
    inputSchema: createNoteSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Create Note
 */
export async function executeCreateNote(
    client: CloseClient,
    params: CreateNoteParams
): Promise<OperationResult> {
    try {
        const response = await client.post<CloseNote>("/activity/note/", params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create note",
                retryable: false
            }
        };
    }
}
