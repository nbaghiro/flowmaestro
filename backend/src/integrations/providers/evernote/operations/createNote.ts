import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EvernoteClient } from "../client/EvernoteClient";

export const createNoteSchema = z.object({
    title: z.string().min(1).max(255).describe("Title of the note"),
    content: z
        .string()
        .describe(
            "Content of the note. Can be plain text or ENML (Evernote Markup Language). Plain text will be automatically converted to ENML."
        ),
    notebookGuid: z
        .string()
        .optional()
        .describe(
            "GUID of the notebook to create the note in. If not specified, the note will be created in the default notebook."
        ),
    tagNames: z
        .array(z.string())
        .optional()
        .describe(
            "Array of tag names to apply to the note. Tags will be created if they don't exist."
        )
});

export type CreateNoteParams = z.infer<typeof createNoteSchema>;

export const createNoteOperation: OperationDefinition = {
    id: "createNote",
    name: "Create Note",
    description:
        "Create a new note in Evernote. The content can be plain text (will be converted to ENML) or ENML markup. Optionally specify a notebook and tags.",
    category: "notes",
    actionType: "write",
    inputSchema: createNoteSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateNote(
    client: EvernoteClient,
    params: CreateNoteParams
): Promise<OperationResult> {
    try {
        const note = await client.createNote(
            params.title,
            params.content,
            params.notebookGuid,
            params.tagNames
        );

        return {
            success: true,
            data: {
                guid: note.guid,
                title: note.title,
                notebookGuid: note.notebookGuid,
                tagNames: note.tagNames,
                createdAt: note.created ? new Date(note.created).toISOString() : undefined,
                updatedAt: note.updated ? new Date(note.updated).toISOString() : undefined
            }
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
