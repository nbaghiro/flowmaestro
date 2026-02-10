import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GhostClient } from "../client/GhostClient";

export const updatePostSchema = z.object({
    id: z.string().min(1).describe("The ID of the post to update"),
    updatedAt: z
        .string()
        .min(1)
        .describe("The updated_at timestamp of the post (required for conflict detection)"),
    title: z.string().optional().describe("Updated title"),
    html: z.string().optional().describe("Updated HTML content"),
    status: z
        .enum(["published", "draft", "scheduled"])
        .optional()
        .describe("Updated publish status"),
    visibility: z.enum(["public", "members", "paid"]).optional().describe("Updated visibility"),
    tags: z.array(z.string()).optional().describe("Updated tag names"),
    featured: z.boolean().optional().describe("Whether the post is featured"),
    featureImage: z
        .string()
        .url()
        .optional()
        .nullable()
        .describe("Updated feature image URL (null to remove)"),
    excerpt: z.string().optional().describe("Updated excerpt")
});

export type UpdatePostParams = z.infer<typeof updatePostSchema>;

export const updatePostOperation: OperationDefinition = {
    id: "updatePost",
    name: "Update Post",
    description:
        "Update an existing Ghost post. Requires the updated_at timestamp for conflict detection.",
    category: "data",
    inputSchema: updatePostSchema,
    retryable: false,
    timeout: 30000
};

export async function executeUpdatePost(
    client: GhostClient,
    params: UpdatePostParams
): Promise<OperationResult> {
    try {
        const updateData: Record<string, unknown> = {
            updated_at: params.updatedAt
        };

        if (params.title !== undefined) updateData.title = params.title;
        if (params.html !== undefined) updateData.html = params.html;
        if (params.status !== undefined) updateData.status = params.status;
        if (params.visibility !== undefined) updateData.visibility = params.visibility;
        if (params.tags !== undefined) {
            updateData.tags = params.tags.map((name) => ({ name }));
        }
        if (params.featured !== undefined) updateData.featured = params.featured;
        if (params.featureImage !== undefined) {
            updateData.feature_image = params.featureImage;
        }
        if (params.excerpt !== undefined) updateData.excerpt = params.excerpt;

        const response = await client.updatePost(params.id, updateData as never);

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
                message: error instanceof Error ? error.message : "Failed to update post",
                retryable: false
            }
        };
    }
}
