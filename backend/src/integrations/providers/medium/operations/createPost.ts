import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MediumClient } from "../client/MediumClient";

export const createPostSchema = z.object({
    authorId: z.string().describe("The author's user ID (use getMe to retrieve your user ID)"),
    title: z.string().min(1).describe("The title of the post"),
    contentFormat: z.enum(["html", "markdown"]).describe("The format of the content field"),
    content: z.string().min(1).describe("The body of the post in the specified format"),
    tags: z
        .array(z.string())
        .max(5)
        .optional()
        .describe("Tags for the post (max 5). Only the first 3 will be displayed on Medium"),
    canonicalUrl: z
        .string()
        .url()
        .optional()
        .describe("Original URL if this post was published elsewhere first"),
    publishStatus: z
        .enum(["public", "draft", "unlisted"])
        .optional()
        .default("public")
        .describe("The publish status of the post"),
    license: z
        .enum([
            "all-rights-reserved",
            "cc-40-by",
            "cc-40-by-sa",
            "cc-40-by-nd",
            "cc-40-by-nc",
            "cc-40-by-nc-nd",
            "cc-40-by-nc-sa",
            "cc-40-zero",
            "public-domain"
        ])
        .optional()
        .default("all-rights-reserved")
        .describe("The license for the post"),
    notifyFollowers: z
        .boolean()
        .optional()
        .describe("Whether to notify followers about this post (only for public posts)")
});

export type CreatePostParams = z.infer<typeof createPostSchema>;

export const createPostOperation: OperationDefinition = {
    id: "createPost",
    name: "Create Post",
    description: "Create a new post under the authenticated user's profile",
    category: "post",
    inputSchema: createPostSchema,
    retryable: false,
    timeout: 60000
};

export async function executeCreatePost(
    client: MediumClient,
    params: CreatePostParams
): Promise<OperationResult> {
    try {
        const response = await client.createPost(params.authorId, {
            title: params.title,
            contentFormat: params.contentFormat,
            content: params.content,
            tags: params.tags,
            canonicalUrl: params.canonicalUrl,
            publishStatus: params.publishStatus,
            license: params.license,
            notifyFollowers: params.notifyFollowers
        });

        const post = response.data;

        return {
            success: true,
            data: {
                id: post.id,
                title: post.title,
                authorId: post.authorId,
                url: post.url,
                canonicalUrl: post.canonicalUrl,
                publishStatus: post.publishStatus,
                publishedAt: post.publishedAt
                    ? new Date(post.publishedAt).toISOString()
                    : undefined,
                license: post.license,
                licenseUrl: post.licenseUrl,
                tags: post.tags
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
