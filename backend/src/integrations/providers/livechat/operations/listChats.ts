import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { LiveChatChatsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listChatsSchema = z.object({
    limit: z.number().optional().default(25).describe("Number of chats to return (max 100)"),
    page_id: z.string().optional().describe("Pagination cursor for next page")
});

export type ListChatsParams = z.infer<typeof listChatsSchema>;

export const listChatsOperation: OperationDefinition = {
    id: "listChats",
    name: "List Chats",
    description: "List active chat summaries",
    category: "chats",
    actionType: "read",
    inputSchema: listChatsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeListChats(
    client: LiveChatClient,
    params: ListChatsParams
): Promise<OperationResult> {
    try {
        const payload: Record<string, unknown> = {};
        if (params.limit) payload.limit = params.limit;
        if (params.page_id) payload.page_id = params.page_id;

        const response = await client.agentAction<LiveChatChatsResponse>("list_chats", payload);

        return {
            success: true,
            data: {
                chats: response.chats_summary.map((c) => ({
                    id: c.id,
                    lastThread: c.last_thread_summary,
                    users: c.users,
                    properties: c.properties
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
                message: error instanceof Error ? error.message : "Failed to list chats",
                retryable: true
            }
        };
    }
}
