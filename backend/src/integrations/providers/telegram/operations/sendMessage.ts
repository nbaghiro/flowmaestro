import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { TelegramClient } from "../client/TelegramClient";
import {
    TelegramChatIdSchema,
    TelegramTextSchema,
    TelegramParseModeSchema,
    TelegramDisableNotificationSchema,
    TelegramReplyToMessageIdSchema
} from "../schemas";
import type { TelegramSendMessageResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Send Message operation schema
 */
export const sendMessageSchema = z.object({
    chat_id: TelegramChatIdSchema,
    text: TelegramTextSchema,
    parse_mode: TelegramParseModeSchema,
    disable_notification: TelegramDisableNotificationSchema,
    reply_to_message_id: TelegramReplyToMessageIdSchema
});

export type SendMessageParams = z.infer<typeof sendMessageSchema>;

/**
 * Send Message operation definition
 */
export const sendMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendMessage",
            name: "Send Message",
            description: "Send a text message to a Telegram chat",
            category: "messaging",
            inputSchema: sendMessageSchema,
            inputSchemaJSON: toJSONSchema(sendMessageSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Telegram", err: error },
            "Failed to create sendMessageOperation"
        );
        throw new Error(
            `Failed to create sendMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send message operation
 */
export async function executeSendMessage(
    client: TelegramClient,
    params: SendMessageParams
): Promise<OperationResult> {
    try {
        const response = (await client.sendMessage({
            chat_id: params.chat_id,
            text: params.text,
            parse_mode: params.parse_mode,
            disable_notification: params.disable_notification,
            reply_to_message_id: params.reply_to_message_id
        })) as TelegramSendMessageResponse;

        return {
            success: true,
            data: {
                messageId: response.message_id,
                chatId: response.chat.id,
                date: response.date,
                text: response.text
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send message",
                retryable: true
            }
        };
    }
}
