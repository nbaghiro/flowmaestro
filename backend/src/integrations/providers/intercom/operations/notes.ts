/**
 * Intercom Notes Operations
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { IntercomClient } from "../client/IntercomClient";
import type { IntercomNote, IntercomListResponse } from "../types";

// ============================================
// Create Note
// ============================================

export const createNoteSchema = z.object({
    contactId: z.string().min(1).describe("The unique identifier of the contact"),
    body: z.string().min(1).describe("Note content (HTML supported)"),
    admin_id: z.string().optional().describe("Admin ID creating the note")
});

export type CreateNoteParams = z.infer<typeof createNoteSchema>;

export const createNoteOperation: OperationDefinition = {
    id: "createNote",
    name: "Create Note",
    description: "Add a note to a contact",
    category: "data",
    inputSchema: createNoteSchema,
    retryable: false,
    timeout: 10000
};

export async function executeCreateNote(
    client: IntercomClient,
    params: CreateNoteParams
): Promise<OperationResult> {
    try {
        const note = (await client.createNote(
            params.contactId,
            params.body,
            params.admin_id
        )) as IntercomNote;

        return {
            success: true,
            data: note
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

// ============================================
// List Notes
// ============================================

export const listNotesSchema = z.object({
    contactId: z.string().min(1).describe("The unique identifier of the contact")
});

export type ListNotesParams = z.infer<typeof listNotesSchema>;

export const listNotesOperation: OperationDefinition = {
    id: "listNotes",
    name: "List Notes",
    description: "List all notes for a contact",
    category: "data",
    inputSchema: listNotesSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListNotes(
    client: IntercomClient,
    params: ListNotesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listNotes(
            params.contactId
        )) as IntercomListResponse<IntercomNote>;

        return {
            success: true,
            data: {
                notes: response.data || []
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list notes",
                retryable: true
            }
        };
    }
}
