import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ContentfulClient } from "../client/ContentfulClient";

export const listEntriesSchema = z.object({
    contentType: z.string().optional().describe("Filter entries by content type ID"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .default(100)
        .describe("Maximum number of entries to return (1-1000, default: 100)"),
    skip: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe("Number of entries to skip for pagination"),
    environmentId: z
        .string()
        .optional()
        .default("master")
        .describe("The environment ID (defaults to 'master')")
});

export type ListEntriesParams = z.infer<typeof listEntriesSchema>;

export const listEntriesOperation: OperationDefinition = {
    id: "listEntries",
    name: "List Entries",
    description:
        "List entries in a Contentful space with optional content type filter and pagination",
    category: "data",
    inputSchema: listEntriesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListEntries(
    client: ContentfulClient,
    params: ListEntriesParams
): Promise<OperationResult> {
    try {
        const response = await client.listEntries(
            {
                contentType: params.contentType,
                limit: params.limit,
                skip: params.skip
            },
            params.environmentId
        );

        const entries = response.items.map((entry) => ({
            id: entry.sys.id,
            contentTypeId: entry.sys.contentType?.sys.id,
            version: entry.sys.version,
            fields: entry.fields,
            createdAt: entry.sys.createdAt,
            updatedAt: entry.sys.updatedAt,
            publishedAt: entry.sys.publishedAt
        }));

        return {
            success: true,
            data: {
                entries,
                total: response.total,
                skip: response.skip,
                limit: response.limit
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list entries",
                retryable: true
            }
        };
    }
}
