import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GhostClient } from "../client/GhostClient";

export const getPostSchema = z.object({
    idOrSlug: z.string().min(1).describe("The post ID or slug to retrieve"),
    by: z
        .enum(["id", "slug"])
        .optional()
        .default("id")
        .describe("Whether to look up by 'id' or 'slug' (default: 'id')")
});

export type GetPostParams = z.infer<typeof getPostSchema>;

export const getPostOperation: OperationDefinition = {
    id: "getPost",
    name: "Get Post",
    description: "Get a single Ghost post by ID or slug",
    category: "data",
    inputSchema: getPostSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetPost(
    client: GhostClient,
    params: GetPostParams
): Promise<OperationResult> {
    try {
        const response =
            params.by === "slug"
                ? await client.getPostBySlug(params.idOrSlug)
                : await client.getPostById(params.idOrSlug);

        const post = response.posts[0];
        if (!post) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Post not found",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                id: post.id,
                uuid: post.uuid,
                title: post.title,
                slug: post.slug,
                html: post.html,
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
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get post",
                retryable: true
            }
        };
    }
}
