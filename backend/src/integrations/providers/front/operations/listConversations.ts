import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const listConversationsSchema = z.object({
    query: z.string().optional().describe("Search query to filter conversations"),
    inboxId: z.string().optional().describe("Filter by inbox ID"),
    tagId: z.string().optional().describe("Filter by tag ID"),
    status: z
        .enum(["archived", "deleted", "open", "spam", "assigned", "unassigned"])
        .optional()
        .describe("Filter by conversation status"),
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum results to return (default: 50, max: 100)"),
    pageToken: z.string().optional().describe("Pagination token for next page")
});

export type ListConversationsParams = z.infer<typeof listConversationsSchema>;

export const listConversationsOperation: OperationDefinition = {
    id: "listConversations",
    name: "List Conversations",
    description: "List conversations in Front with optional filters",
    category: "data",
    inputSchema: listConversationsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListConversations(
    client: FrontClient,
    params: ListConversationsParams
): Promise<OperationResult> {
    try {
        const response = await client.listConversations({
            q: params.query,
            inbox_id: params.inboxId,
            tag_id: params.tagId,
            status: params.status,
            limit: params.limit,
            page_token: params.pageToken
        });

        return {
            success: true,
            data: {
                conversations: response._results.map((c) => ({
                    id: c.id,
                    subject: c.subject,
                    status: c.status,
                    assignee: c.assignee
                        ? {
                              id: c.assignee.id,
                              email: c.assignee.email,
                              name: `${c.assignee.first_name} ${c.assignee.last_name}`.trim()
                          }
                        : null,
                    tags: c.tags.map((t) => ({ id: t.id, name: t.name })),
                    createdAt: new Date(c.created_at * 1000).toISOString(),
                    isPrivate: c.is_private,
                    lastMessageBlurb: c.last_message?.blurb
                })),
                pagination: {
                    nextToken: response._pagination?.next
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list conversations",
                retryable: true
            }
        };
    }
}
