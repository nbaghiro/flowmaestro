import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { FacebookClient } from "../client/FacebookClient";
import type { MessengerMessageResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Get Messages operation schema
 */
export const getMessagesSchema = z.object({
    conversationId: z.string().describe("The conversation ID to get messages from"),
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Maximum number of messages to return"),
    after: z.string().optional().describe("Pagination cursor for next page")
});

export type GetMessagesParams = z.infer<typeof getMessagesSchema>;

/**
 * Get Messages operation definition
 */
export const getMessagesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getMessages",
            name: "Get Messages",
            description: "Get messages from a Messenger conversation",
            category: "messaging",
            inputSchema: getMessagesSchema,
            inputSchemaJSON: toJSONSchema(getMessagesSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Messenger", err: error }, "Failed to create getMessagesOperation");
        throw new Error(
            `Failed to create getMessages operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get messages operation
 */
export async function executeGetMessages(
    client: FacebookClient,
    params: GetMessagesParams
): Promise<OperationResult> {
    try {
        const response = await client.getMessages(params.conversationId, {
            limit: params.limit,
            after: params.after
        });

        const messages: MessengerMessageResponse[] = response.data.map((msg) => ({
            id: msg.id,
            createdTime: msg.created_time,
            from: {
                id: msg.from.id,
                name: msg.from.name
            },
            text: msg.message,
            attachments: msg.attachments?.data.map((att) => ({
                id: att.id,
                type: att.mime_type,
                url: att.file_url || att.image_data?.url || att.video_data?.url
            }))
        }));

        return {
            success: true,
            data: {
                messages,
                nextCursor: response.paging?.cursors?.after
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get messages",
                retryable: true
            }
        };
    }
}
