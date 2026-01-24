import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { TelegramClient } from "../client/TelegramClient";
import {
    TelegramChatIdSchema,
    TelegramFileSchema,
    TelegramCaptionSchema,
    TelegramParseModeSchema,
    TelegramDisableNotificationSchema
} from "../schemas";
import type { TelegramSendPhotoResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Send Photo operation schema
 */
export const sendPhotoSchema = z.object({
    chat_id: TelegramChatIdSchema,
    photo: TelegramFileSchema.describe(
        "Photo to send. Pass a file_id to send a photo that exists on Telegram servers, or pass an HTTP URL."
    ),
    caption: TelegramCaptionSchema,
    parse_mode: TelegramParseModeSchema,
    disable_notification: TelegramDisableNotificationSchema
});

export type SendPhotoParams = z.infer<typeof sendPhotoSchema>;

/**
 * Send Photo operation definition
 */
export const sendPhotoOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendPhoto",
            name: "Send Photo",
            description: "Send a photo to a Telegram chat",
            category: "media",
            inputSchema: sendPhotoSchema,
            inputSchemaJSON: toJSONSchema(sendPhotoSchema),
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Telegram", err: error }, "Failed to create sendPhotoOperation");
        throw new Error(
            `Failed to create sendPhoto operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send photo operation
 */
export async function executeSendPhoto(
    client: TelegramClient,
    params: SendPhotoParams
): Promise<OperationResult> {
    try {
        const response = (await client.sendPhoto({
            chat_id: params.chat_id,
            photo: params.photo,
            caption: params.caption,
            parse_mode: params.parse_mode,
            disable_notification: params.disable_notification
        })) as TelegramSendPhotoResponse;

        return {
            success: true,
            data: {
                messageId: response.message_id,
                chatId: response.chat.id,
                date: response.date,
                photo: response.photo,
                caption: response.caption
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send photo",
                retryable: true
            }
        };
    }
}
