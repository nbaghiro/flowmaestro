import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EvernoteClient } from "../client/EvernoteClient";

export const getNoteSchema = z.object({
    guid: z.string().describe("The GUID of the note to retrieve"),
    withContent: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include the note content (ENML). Defaults to true.")
});

export type GetNoteParams = z.infer<typeof getNoteSchema>;

export const getNoteOperation: OperationDefinition = {
    id: "getNote",
    name: "Get Note",
    description:
        "Retrieve a specific note by its GUID. Returns the note's title, content, tags, and metadata.",
    category: "notes",
    actionType: "read",
    inputSchema: getNoteSchema,
    inputSchemaJSON: toJSONSchema(getNoteSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetNote(
    client: EvernoteClient,
    params: GetNoteParams
): Promise<OperationResult> {
    try {
        const note = await client.getNote(params.guid, params.withContent);

        // Extract plain text from ENML if content is present
        let plainTextContent: string | undefined;
        if (note.content) {
            plainTextContent = client.extractTextFromENML(note.content);
        }

        return {
            success: true,
            data: {
                guid: note.guid,
                title: note.title,
                content: note.content,
                plainTextContent,
                notebookGuid: note.notebookGuid,
                tagGuids: note.tagGuids,
                tagNames: note.tagNames,
                active: note.active,
                createdAt: note.created ? new Date(note.created).toISOString() : undefined,
                updatedAt: note.updated ? new Date(note.updated).toISOString() : undefined,
                deletedAt: note.deleted ? new Date(note.deleted).toISOString() : undefined
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get note",
                retryable: true
            }
        };
    }
}
