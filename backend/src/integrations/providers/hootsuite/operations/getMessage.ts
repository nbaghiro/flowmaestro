import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { HootsuiteClient } from "../client/HootsuiteClient";
import { HootsuiteMessageIdSchema } from "../schemas";
import type { HootsuiteMessage } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Message operation schema
 */
export const getMessageSchema = z.object({
    messageId: HootsuiteMessageIdSchema
});

export type GetMessageParams = z.infer<typeof getMessageSchema>;

/**
 * Get Message operation definition
 */
export const getMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getMessage",
            name: "Get Message",
            description: "Get details of a specific Hootsuite message",
            category: "messages",
            inputSchema: getMessageSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Hootsuite", err: error },
            "Failed to create getMessageOperation"
        );
        throw new Error(
            `Failed to create getMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get message operation
 */
export async function executeGetMessage(
    client: HootsuiteClient,
    params: GetMessageParams
): Promise<OperationResult> {
    try {
        const message = (await client.getMessage(params.messageId)) as HootsuiteMessage;

        return {
            success: true,
            data: {
                id: message.id,
                state: message.state,
                text: message.text,
                socialProfileId: message.socialProfile?.id,
                socialProfileType: message.socialProfile?.type,
                scheduledSendTime: message.scheduledSendTime,
                createdAt: message.createdAt,
                sentAt: message.sentAt,
                mediaUrls: message.mediaUrls,
                extendedInfo: message.extendedInfo
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get message",
                retryable: true
            }
        };
    }
}
