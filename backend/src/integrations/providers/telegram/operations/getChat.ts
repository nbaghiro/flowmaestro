import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { TelegramClient } from "../client/TelegramClient";
import { TelegramChatIdSchema } from "../schemas";
import type { TelegramGetChatResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Chat operation schema
 */
export const getChatSchema = z.object({
    chat_id: TelegramChatIdSchema
});

export type GetChatParams = z.infer<typeof getChatSchema>;

/**
 * Get Chat operation definition
 */
export const getChatOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getChat",
            name: "Get Chat",
            description: "Get up-to-date information about a chat",
            category: "data",
            inputSchema: getChatSchema,
            inputSchemaJSON: toJSONSchema(getChatSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Telegram", err: error }, "Failed to create getChatOperation");
        throw new Error(
            `Failed to create getChat operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get chat operation
 */
export async function executeGetChat(
    client: TelegramClient,
    params: GetChatParams
): Promise<OperationResult> {
    try {
        const response = (await client.getChat({
            chat_id: params.chat_id
        })) as TelegramGetChatResponse;

        return {
            success: true,
            data: {
                id: response.id,
                type: response.type,
                title: response.title,
                username: response.username,
                firstName: response.first_name,
                lastName: response.last_name,
                description: response.description,
                bio: response.bio
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get chat info",
                retryable: true
            }
        };
    }
}
