import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GhostClient } from "../client/GhostClient";

export const createPostSchema = z.object({
    title: z.string().min(1).describe("The title of the post"),
    html: z.string().optional().describe("The HTML content of the post"),
    status: z
        .enum(["published", "draft", "scheduled"])
        .optional()
        .default("draft")
        .describe("The publish status (default: 'draft')"),
    visibility: z
        .enum(["public", "members", "paid"])
        .optional()
        .default("public")
        .describe("Post visibility (default: 'public')"),
    tags: z.array(z.string()).optional().describe("Tag names to associate with the post"),
    featured: z.boolean().optional().describe("Whether the post is featured"),
    featureImage: z.string().url().optional().describe("URL of the feature image"),
    excerpt: z.string().optional().describe("Custom excerpt for the post"),
    publishedAt: z
        .string()
        .optional()
        .describe("Scheduled publish date (ISO 8601 format, for scheduled posts)")
});

export type CreatePostParams = z.infer<typeof createPostSchema>;

export const createPostOperation: OperationDefinition = {
    id: "createPost",
    name: "Create Post",
    description: "Create a new post on a Ghost site",
    category: "data",
    inputSchema: createPostSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreatePost(
    client: GhostClient,
    params: CreatePostParams
): Promise<OperationResult> {
    try {
        const response = await client.createPost({
            title: params.title,
            html: params.html,
            status: params.status,
            visibility: params.visibility,
            tags: params.tags?.map((name) => ({ name })),
            featured: params.featured,
            feature_image: params.featureImage,
            excerpt: params.excerpt,
            published_at: params.publishedAt
        });

        const post = response.posts[0];

        return {
            success: true,
            data: {
                id: post.id,
                uuid: post.uuid,
                title: post.title,
                slug: post.slug,
                status: post.status,
                visibility: post.visibility,
                url: post.url,
                createdAt: post.created_at,
                updatedAt: post.updated_at,
                publishedAt: post.published_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create post",
                retryable: false
            }
        };
    }
}
