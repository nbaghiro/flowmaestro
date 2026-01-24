import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { TelegramClient } from "../client/TelegramClient";
import {
    TelegramChatIdSchema,
    TelegramMessageIdSchema,
    TelegramTextSchema,
    TelegramParseModeSchema
} from "../schemas";
import type { TelegramEditMessageResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Edit Message Text operation schema
 */
export const editMessageTextSchema = z.object({
    chat_id: TelegramChatIdSchema,
    message_id: TelegramMessageIdSchema,
    text: TelegramTextSchema.describe("New text of the message"),
    parse_mode: TelegramParseModeSchema
});

export type EditMessageTextParams = z.infer<typeof editMessageTextSchema>;

/**
 * Edit Message Text operation definition
 */
export const editMessageTextOperation: OperationDefinition = (() => {
    try {
        return {
            id: "editMessageText",
            name: "Edit Message",
            description: "Edit the text of a previously sent message",
            category: "messaging",
            inputSchema: editMessageTextSchema,
            inputSchemaJSON: toJSONSchema(editMessageTextSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Telegram", err: error },
            "Failed to create editMessageTextOperation"
        );
        throw new Error(
            `Failed to create editMessageText operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute edit message text operation
 */
export async function executeEditMessageText(
    client: TelegramClient,
    params: EditMessageTextParams
): Promise<OperationResult> {
    try {
        const response = (await client.editMessageText({
            chat_id: params.chat_id,
            message_id: params.message_id,
            text: params.text,
            parse_mode: params.parse_mode
        })) as TelegramEditMessageResponse;

        return {
            success: true,
            data: {
                messageId: response.message_id,
                chatId: response.chat.id,
                date: response.date,
                editDate: response.edit_date,
                text: response.text
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to edit message",
                retryable: true
            }
        };
    }
}
