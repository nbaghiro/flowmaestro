import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { TelegramClient } from "../client/TelegramClient";
import type { TelegramGetMeResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Me operation schema - no parameters needed
 */
export const getMeSchema = z.object({});

export type GetMeParams = z.infer<typeof getMeSchema>;

/**
 * Get Me operation definition
 */
export const getMeOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getMe",
            name: "Get Bot Info",
            description: "Get basic information about the bot",
            category: "data",
            inputSchema: getMeSchema,
            inputSchemaJSON: toJSONSchema(getMeSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Telegram", err: error }, "Failed to create getMeOperation");
        throw new Error(
            `Failed to create getMe operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get me operation
 */
export async function executeGetMe(
    client: TelegramClient,
    _params: GetMeParams
): Promise<OperationResult> {
    try {
        const response = (await client.getMe()) as TelegramGetMeResponse;

        return {
            success: true,
            data: {
                id: response.id,
                isBot: response.is_bot,
                firstName: response.first_name,
                lastName: response.last_name,
                username: response.username,
                languageCode: response.language_code
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get bot info",
                retryable: true
            }
        };
    }
}
