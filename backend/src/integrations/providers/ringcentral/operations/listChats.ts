import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

export const listChatsSchema = z.object({
    type: z
        .array(z.enum(["Everyone", "Group", "Personal", "Direct", "Team"]))
        .optional()
        .describe("Filter by chat type(s)"),
    recordCount: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe("Number of results to return (max: 250)"),
    pageToken: z.string().optional().describe("Pagination token for next page")
});

export type ListChatsParams = z.infer<typeof listChatsSchema>;

export const listChatsOperation: OperationDefinition = {
    id: "listChats",
    name: "List Chats",
    description: "List team messaging chats",
    category: "data",
    inputSchema: listChatsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListChats(
    client: RingCentralClient,
    params: ListChatsParams
): Promise<OperationResult> {
    try {
        const response = await client.listChats({
            type: params.type,
            recordCount: params.recordCount,
            pageToken: params.pageToken
        });

        return {
            success: true,
            data: {
                chats: response.records.map((chat) => ({
                    id: chat.id,
                    type: chat.type,
                    name: chat.name,
                    description: chat.description,
                    status: chat.status,
                    createdAt: chat.creationTime,
                    lastModifiedAt: chat.lastModifiedTime,
                    memberCount: chat.members?.length || 0
                })),
                pagination: {
                    nextToken: response.navigation?.nextPageToken
                }
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
