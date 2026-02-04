import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ContentfulClient } from "../client/ContentfulClient";

export const updateEntrySchema = z.object({
    entryId: z.string().min(1).describe("The ID of the entry to update"),
    version: z
        .number()
        .int()
        .min(1)
        .describe("The current version of the entry (for optimistic locking)"),
    fields: z
        .record(z.record(z.unknown()))
        .describe(
            "The updated entry fields as locale-aware objects, e.g. { title: { 'en-US': 'Updated' } }"
        ),
    environmentId: z
        .string()
        .optional()
        .default("master")
        .describe("The environment ID (defaults to 'master')")
});

export type UpdateEntryParams = z.infer<typeof updateEntrySchema>;

export const updateEntryOperation: OperationDefinition = {
    id: "updateEntry",
    name: "Update Entry",
    description:
        "Update an existing Contentful entry. Requires the current version number for optimistic locking.",
    category: "data",
    inputSchema: updateEntrySchema,
    retryable: false,
    timeout: 30000
};

export async function executeUpdateEntry(
    client: ContentfulClient,
    params: UpdateEntryParams
): Promise<OperationResult> {
    try {
        const entry = await client.updateEntry(
            params.entryId,
            params.version,
            params.fields,
            params.environmentId
        );

        return {
            success: true,
            data: {
                id: entry.sys.id,
                contentTypeId: entry.sys.contentType?.sys.id,
                version: entry.sys.version,
                fields: entry.fields,
                createdAt: entry.sys.createdAt,
                updatedAt: entry.sys.updatedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update entry",
                retryable: false
            }
        };
    }
}
