import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ContentfulClient } from "../client/ContentfulClient";

export const createEntrySchema = z.object({
    contentTypeId: z.string().min(1).describe("The ID of the content type for the new entry"),
    fields: z
        .record(z.record(z.unknown()))
        .describe("The entry fields as locale-aware objects, e.g. { title: { 'en-US': 'Hello' } }"),
    environmentId: z
        .string()
        .optional()
        .default("master")
        .describe("The environment ID (defaults to 'master')")
});

export type CreateEntryParams = z.infer<typeof createEntrySchema>;

export const createEntryOperation: OperationDefinition = {
    id: "createEntry",
    name: "Create Entry",
    description: "Create a new entry for a content type in Contentful",
    category: "data",
    inputSchema: createEntrySchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateEntry(
    client: ContentfulClient,
    params: CreateEntryParams
): Promise<OperationResult> {
    try {
        const entry = await client.createEntry(
            params.contentTypeId,
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
                message: error instanceof Error ? error.message : "Failed to create entry",
                retryable: false
            }
        };
    }
}
