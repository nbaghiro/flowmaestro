import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { TelegramClient } from "../client/TelegramClient";
import {
    TelegramChatIdSchema,
    TelegramMessageIdSchema,
    TelegramDisableNotificationSchema
} from "../schemas";
import type { TelegramForwardMessageResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Forward Message operation schema
 */
export const forwardMessageSchema = z.object({
    chat_id: TelegramChatIdSchema.describe("Target chat to forward the message to"),
    from_chat_id: TelegramChatIdSchema.describe("Source chat where the original message was sent"),
    message_id: TelegramMessageIdSchema.describe("Message identifier in the source chat"),
    disable_notification: TelegramDisableNotificationSchema
});

export type ForwardMessageParams = z.infer<typeof forwardMessageSchema>;

/**
 * Forward Message operation definition
 */
export const forwardMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "forwardMessage",
            name: "Forward Message",
            description: "Forward a message from one chat to another",
            category: "messaging",
            inputSchema: forwardMessageSchema,
            inputSchemaJSON: toJSONSchema(forwardMessageSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Telegram", err: error },
            "Failed to create forwardMessageOperation"
        );
        throw new Error(
            `Failed to create forwardMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute forward message operation
 */
export async function executeForwardMessage(
    client: TelegramClient,
    params: ForwardMessageParams
): Promise<OperationResult> {
    try {
        const response = (await client.forwardMessage({
            chat_id: params.chat_id,
            from_chat_id: params.from_chat_id,
            message_id: params.message_id,
            disable_notification: params.disable_notification
        })) as TelegramForwardMessageResponse;

        return {
            success: true,
            data: {
                messageId: response.message_id,
                chatId: response.chat.id,
                date: response.date,
                forwardDate: response.forward_date,
                forwardFrom: response.forward_from
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to forward message",
                retryable: true
            }
        };
    }
}
