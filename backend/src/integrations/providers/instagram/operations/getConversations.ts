import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramConversationResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Conversations operation schema
 */
export const getConversationsSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID connected to the Instagram account"),
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Maximum number of conversations to return"),
    after: z.string().optional().describe("Pagination cursor for next page")
});

export type GetConversationsParams = z.infer<typeof getConversationsSchema>;

/**
 * Get Conversations operation definition
 */
export const getConversationsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getConversations",
            name: "Get Conversations",
            description: "List Instagram Direct Message conversations",
            category: "messaging",
            inputSchema: getConversationsSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Instagram", err: error },
            "Failed to create getConversationsOperation"
        );
        throw new Error(
            `Failed to create getConversations operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get conversations operation
 */
export async function executeGetConversations(
    client: InstagramClient,
    params: GetConversationsParams
): Promise<OperationResult> {
    try {
        const response = await client.getConversations(params.pageId, {
            limit: params.limit,
            after: params.after
        });

        const conversations: InstagramConversationResponse[] = response.data.map((conv) => ({
            id: conv.id,
            updatedTime: conv.updated_time,
            participants: conv.participants.data.map((p) => ({
                id: p.id,
                username: p.username,
                name: p.name
            }))
        }));

        return {
            success: true,
            data: {
                conversations,
                nextCursor: response.paging?.cursors?.after
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get conversations",
                retryable: true
            }
        };
    }
}
