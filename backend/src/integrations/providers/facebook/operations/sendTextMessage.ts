import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { FacebookClient } from "../client/FacebookClient";
import type { MessengerSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Send Text Message operation schema
 */
export const sendTextMessageSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID"),
    recipientId: z.string().describe("The Page-Scoped ID (PSID) of the recipient"),
    text: z.string().min(1).max(2000).describe("The text message content (max 2000 characters)"),
    tag: z
        .enum(["CONFIRMED_EVENT_UPDATE", "POST_PURCHASE_UPDATE", "ACCOUNT_UPDATE", "HUMAN_AGENT"])
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
            description: "Send a text message to a Messenger user",
            category: "messaging",
            inputSchema: sendTextMessageSchema,
            inputSchemaJSON: toJSONSchema(sendTextMessageSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Messenger", err: error }, "Failed to create sendTextMessageOperation");
        throw new Error(
            `Failed to create sendTextMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send text message operation
 */
export async function executeSendTextMessage(
    client: FacebookClient,
    params: SendTextMessageParams
): Promise<OperationResult> {
    try {
        const response = await client.sendTextMessage(
            params.pageId,
            params.recipientId,
            params.text,
            params.tag
        );

        const data: MessengerSendResponse = {
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
