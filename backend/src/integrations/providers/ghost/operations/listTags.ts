import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GhostClient } from "../client/GhostClient";

export const listTagsSchema = z.object({
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(15)
        .describe("Maximum number of tags to return (1-100, default: 15)"),
    page: z.number().int().min(1).optional().default(1).describe("Page number for pagination")
});

export type ListTagsParams = z.infer<typeof listTagsSchema>;

export const listTagsOperation: OperationDefinition = {
    id: "listTags",
    name: "List Tags",
    description: "List all tags on a Ghost site",
    category: "data",
    inputSchema: listTagsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListTags(
    client: GhostClient,
    params: ListTagsParams
): Promise<OperationResult> {
    try {
        const response = await client.listTags({
            limit: params.limit,
            page: params.page
        });

        const tags = response.tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            description: tag.description,
            visibility: tag.visibility,
            url: tag.url
        }));

        return {
            success: true,
            data: {
                tags,
                pagination: response.meta.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tags",
                retryable: true
            }
        };
    }
}
