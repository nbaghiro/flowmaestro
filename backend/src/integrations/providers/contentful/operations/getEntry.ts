import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ContentfulClient } from "../client/ContentfulClient";

export const getEntrySchema = z.object({
    entryId: z.string().min(1).describe("The ID of the entry to retrieve"),
    environmentId: z
        .string()
        .optional()
        .default("master")
        .describe("The environment ID (defaults to 'master')")
});

export type GetEntryParams = z.infer<typeof getEntrySchema>;

export const getEntryOperation: OperationDefinition = {
    id: "getEntry",
    name: "Get Entry",
    description: "Get a single Contentful entry by its ID",
    category: "data",
    inputSchema: getEntrySchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetEntry(
    client: ContentfulClient,
    params: GetEntryParams
): Promise<OperationResult> {
    try {
        const entry = await client.getEntry(params.entryId, params.environmentId);

        return {
            success: true,
            data: {
                id: entry.sys.id,
                contentTypeId: entry.sys.contentType?.sys.id,
                version: entry.sys.version,
                fields: entry.fields,
                createdAt: entry.sys.createdAt,
                updatedAt: entry.sys.updatedAt,
                publishedAt: entry.sys.publishedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get entry",
                retryable: true
            }
        };
    }
}
