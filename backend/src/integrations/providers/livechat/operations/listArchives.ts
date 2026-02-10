import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { LiveChatArchivesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listArchivesSchema = z.object({
    limit: z.number().optional().default(25).describe("Number of archived chats to return"),
    page_id: z.string().optional().describe("Pagination cursor"),
    filters: z
        .object({
            from: z.string().optional().describe("Start date (ISO 8601)"),
            to: z.string().optional().describe("End date (ISO 8601)"),
            query: z.string().optional().describe("Search query"),
            agent_ids: z.array(z.string()).optional().describe("Filter by agent IDs"),
            group_ids: z.array(z.number()).optional().describe("Filter by group IDs"),
            tags: z.array(z.string()).optional().describe("Filter by tags")
        })
        .optional()
        .describe("Filters for archived chats")
});

export type ListArchivesParams = z.infer<typeof listArchivesSchema>;

export const listArchivesOperation: OperationDefinition = {
    id: "listArchives",
    name: "List Archives",
    description: "List archived (closed) chats with filtering options",
    category: "chats",
    actionType: "read",
    inputSchema: listArchivesSchema,
    retryable: true,
    timeout: 15000
};

export async function executeListArchives(
    client: LiveChatClient,
    params: ListArchivesParams
): Promise<OperationResult> {
    try {
        const payload: Record<string, unknown> = {};
        if (params.limit) payload.limit = params.limit;
        if (params.page_id) payload.page_id = params.page_id;
        if (params.filters) payload.filters = params.filters;

        const response = await client.agentAction<LiveChatArchivesResponse>(
            "list_archives",
            payload
        );

        return {
            success: true,
            data: {
                chats: response.chats.map((c) => ({
                    id: c.id,
                    thread: {
                        id: c.thread.id,
                        active: c.thread.active,
                        createdAt: c.thread.created_at,
                        tags: c.thread.tags
                    },
                    users: c.users
                })),
                foundChats: response.found_chats,
                nextPageId: response.next_page_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list archives",
                retryable: true
            }
        };
    }
}
