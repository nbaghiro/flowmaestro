import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GhostClient } from "../client/GhostClient";

export const listPostsSchema = z.object({
    filter: z
        .string()
        .optional()
        .describe("Ghost NQL filter string, e.g. 'status:published' or 'tag:getting-started'"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(15)
        .describe("Maximum number of posts to return (1-100, default: 15)"),
    page: z.number().int().min(1).optional().default(1).describe("Page number for pagination")
});

export type ListPostsParams = z.infer<typeof listPostsSchema>;

export const listPostsOperation: OperationDefinition = {
    id: "listPosts",
    name: "List Posts",
    description: "List posts from a Ghost site with optional filter and pagination",
    category: "data",
    inputSchema: listPostsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListPosts(
    client: GhostClient,
    params: ListPostsParams
): Promise<OperationResult> {
    try {
        const response = await client.listPosts({
            filter: params.filter,
            limit: params.limit,
            page: params.page
        });

        const posts = response.posts.map((post) => ({
            id: post.id,
            uuid: post.uuid,
            title: post.title,
            slug: post.slug,
            status: post.status,
            visibility: post.visibility,
            url: post.url,
            excerpt: post.excerpt,
            featureImage: post.feature_image,
            featured: post.featured,
            createdAt: post.created_at,
            updatedAt: post.updated_at,
            publishedAt: post.published_at,
            tags: post.tags?.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
            authors: post.authors?.map((a) => ({
                id: a.id,
                name: a.name,
                slug: a.slug
            }))
        }));

        return {
            success: true,
            data: {
                posts,
                pagination: response.meta.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list posts",
                retryable: true
            }
        };
    }
}
