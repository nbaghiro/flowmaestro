import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Send Text Message operation schema
 */
export const sendTextMessageSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID connected to the Instagram account"),
    recipientId: z.string().describe("The Instagram-Scoped ID (IGSID) of the recipient"),
    text: z.string().min(1).max(1000).describe("The text message content (max 1000 characters)"),
    tag: z
        .enum(["HUMAN_AGENT"])
        .optional()
        .describe("Message tag for sending outside the 24h window")
});

export type SendTextMessageParams = z.infer<typeof sendTextMessageSchema>;

/**
 * Send Text Message operation definition
 */
export const sendTextMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendTextMessage",
            name: "Send Text Message",
            description: "Send a text message to an Instagram user via Direct Messages",
            category: "messaging",
            inputSchema: sendTextMessageSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Instagram", err: error },
            "Failed to create sendTextMessageOperation"
        );
        throw new Error(
            `Failed to create sendTextMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send text message operation
 */
export async function executeSendTextMessage(
    client: InstagramClient,
    params: SendTextMessageParams
): Promise<OperationResult> {
    try {
        const response = await client.sendTextMessage(
            params.pageId,
            params.recipientId,
            params.text,
            params.tag
        );

        const data: InstagramSendResponse = {
            messageId: response.message_id,
            recipientId: response.recipient_id
        };

        return {
            success: true,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send text message",
                retryable: true
            }
        };
    }
}
