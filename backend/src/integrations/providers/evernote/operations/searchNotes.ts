import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { EvernoteClient } from "../client/EvernoteClient";

export const searchNotesSchema = z.object({
    query: z
        .string()
        .describe(
            "Search query using Evernote search grammar. Examples: 'notebook:Work meeting', 'tag:important', 'created:day-1', 'intitle:project'"
        ),
    notebookGuid: z
        .string()
        .optional()
        .describe("Optional notebook GUID to limit the search to a specific notebook"),
    offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe("Pagination offset (number of notes to skip)"),
    maxNotes: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .default(25)
        .describe("Maximum number of notes to return (1-250, default 25)")
});

export type SearchNotesParams = z.infer<typeof searchNotesSchema>;

export const searchNotesOperation: OperationDefinition = {
    id: "searchNotes",
    name: "Search Notes",
    description: `Search for notes using Evernote's search grammar. Supports advanced queries like:
- Text search: "meeting notes"
- Notebook: notebook:Work
- Tags: tag:important or -tag:archive
- Date: created:day-1, updated:week-2
- Title: intitle:project
- Source: sourceApplication:*
Combine multiple terms for complex queries.`,
    category: "notes",
    actionType: "read",
    inputSchema: searchNotesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchNotes(
    client: EvernoteClient,
    params: SearchNotesParams
): Promise<OperationResult> {
    try {
        const result = await client.searchNotes(
            params.query,
            params.notebookGuid,
            params.offset,
            params.maxNotes
        );

        // Transform notes to cleaner format
        const notes = result.notes.map((note) => ({
            guid: note.guid,
            title: note.title,
            notebookGuid: note.notebookGuid,
            tagGuids: note.tagGuids,
            tagNames: note.tagNames,
            active: note.active,
            createdAt: note.created ? new Date(note.created).toISOString() : undefined,
            updatedAt: note.updated ? new Date(note.updated).toISOString() : undefined
        }));

        return {
            success: true,
            data: {
                query: params.query,
                totalNotes: result.totalNotes,
                startIndex: result.startIndex,
                returnedCount: notes.length,
                notes
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search notes",
                retryable: true
            }
        };
    }
}
