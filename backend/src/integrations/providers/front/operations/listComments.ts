import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const listCommentsSchema = z.object({
    conversationId: z.string().describe("The conversation ID to list comments from"),
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum results to return (default: 50, max: 100)"),
    pageToken: z.string().optional().describe("Pagination token for next page")
});

export type ListCommentsParams = z.infer<typeof listCommentsSchema>;

export const listCommentsOperation: OperationDefinition = {
    id: "listComments",
    name: "List Comments",
    description: "List all internal comments on a conversation",
    category: "data",
    inputSchema: listCommentsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListComments(
    client: FrontClient,
    params: ListCommentsParams
): Promise<OperationResult> {
    try {
        const response = await client.listComments(params.conversationId, {
            limit: params.limit,
            page_token: params.pageToken
        });

        return {
            success: true,
            data: {
                comments: response._results.map((c) => ({
                    id: c.id,
                    body: c.body,
                    postedAt: new Date(c.posted_at * 1000).toISOString(),
                    author: c.author
                        ? {
                              id: c.author.id,
                              email: c.author.email,
                              name: `${c.author.first_name} ${c.author.last_name}`.trim()
                          }
                        : null,
                    attachmentCount: c.attachments.length
                })),
                pagination: {
                    nextToken: response._pagination?.next
                }
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to list comments";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message: errorMessage,
                retryable: !isNotFound
            }
        };
    }
}
