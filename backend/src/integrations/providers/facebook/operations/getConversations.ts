import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { FacebookClient } from "../client/FacebookClient";
import type { MessengerConversationResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Conversations operation schema
 */
export const getConversationsSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID"),
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
            description: "List Messenger conversations for a Page",
            category: "messaging",
            inputSchema: getConversationsSchema,
            inputSchemaJSON: toJSONSchema(getConversationsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Messenger", err: error },
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
    client: FacebookClient,
    params: GetConversationsParams
): Promise<OperationResult> {
    try {
        const response = await client.getConversations(params.pageId, {
            limit: params.limit,
            after: params.after
        });

        const conversations: MessengerConversationResponse[] = response.data.map((conv) => ({
            id: conv.id,
            updatedTime: conv.updated_time,
            link: conv.link,
            messageCount: conv.message_count,
            unreadCount: conv.unread_count,
            participants: conv.participants.data.map((p) => ({
                id: p.id,
                name: p.name,
                email: p.email
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
