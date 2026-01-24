import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { TelegramClient } from "../client/TelegramClient";
import { TelegramChatIdSchema, TelegramMessageIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Delete Message operation schema
 */
export const deleteMessageSchema = z.object({
    chat_id: TelegramChatIdSchema,
    message_id: TelegramMessageIdSchema
});

export type DeleteMessageParams = z.infer<typeof deleteMessageSchema>;

/**
 * Delete Message operation definition
 */
export const deleteMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteMessage",
            name: "Delete Message",
            description: "Delete a message from a chat",
            category: "messaging",
            inputSchema: deleteMessageSchema,
            inputSchemaJSON: toJSONSchema(deleteMessageSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Telegram", err: error },
            "Failed to create deleteMessageOperation"
        );
        throw new Error(
            `Failed to create deleteMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete message operation
 */
export async function executeDeleteMessage(
    client: TelegramClient,
    params: DeleteMessageParams
): Promise<OperationResult> {
    try {
        await client.deleteMessage({
            chat_id: params.chat_id,
            message_id: params.message_id
        });

        return {
            success: true,
            data: {
                deleted: true,
                messageId: params.message_id,
                chatId: params.chat_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete message",
                retryable: true
            }
        };
    }
}
