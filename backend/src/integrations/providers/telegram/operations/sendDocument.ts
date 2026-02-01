import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { TelegramClient } from "../client/TelegramClient";
import {
    TelegramChatIdSchema,
    TelegramFileSchema,
    TelegramCaptionSchema,
    TelegramParseModeSchema,
    TelegramDisableNotificationSchema
} from "../schemas";
import type { TelegramSendDocumentResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Send Document operation schema
 */
export const sendDocumentSchema = z.object({
    chat_id: TelegramChatIdSchema,
    document: TelegramFileSchema.describe(
        "File to send. Pass a file_id to send a file that exists on Telegram servers, or pass an HTTP URL."
    ),
    caption: TelegramCaptionSchema,
    parse_mode: TelegramParseModeSchema,
    disable_content_type_detection: z
        .boolean()
        .optional()
        .describe("Disables automatic server-side content type detection for the file"),
    disable_notification: TelegramDisableNotificationSchema
});

export type SendDocumentParams = z.infer<typeof sendDocumentSchema>;

/**
 * Send Document operation definition
 */
export const sendDocumentOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendDocument",
            name: "Send Document",
            description: "Send a file/document to a Telegram chat",
            category: "media",
            inputSchema: sendDocumentSchema,
            retryable: true,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "Telegram", err: error },
            "Failed to create sendDocumentOperation"
        );
        throw new Error(
            `Failed to create sendDocument operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send document operation
 */
export async function executeSendDocument(
    client: TelegramClient,
    params: SendDocumentParams
): Promise<OperationResult> {
    try {
        const response = (await client.sendDocument({
            chat_id: params.chat_id,
            document: params.document,
            caption: params.caption,
            parse_mode: params.parse_mode,
            disable_content_type_detection: params.disable_content_type_detection,
            disable_notification: params.disable_notification
        })) as TelegramSendDocumentResponse;

        return {
            success: true,
            data: {
                messageId: response.message_id,
                chatId: response.chat.id,
                date: response.date,
                document: response.document,
                caption: response.caption
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send document",
                retryable: true
            }
        };
    }
}
