import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { WhatsAppClient } from "../client/WhatsAppClient";
import type { WhatsAppSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Send Text Message operation schema
 */
export const sendTextMessageSchema = z.object({
    phoneNumberId: z.string().describe("The WhatsApp Business phone number ID to send from"),
    to: z.string().describe("The recipient's phone number in E.164 format (e.g., +1234567890)"),
    text: z.string().min(1).max(4096).describe("The text message content"),
    previewUrl: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to show URL previews in the message")
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
            description: "Send a text message to a WhatsApp user",
            category: "messaging",
            inputSchema: sendTextMessageSchema,
            inputSchemaJSON: toJSONSchema(sendTextMessageSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "WhatsApp", err: error }, "Failed to create sendTextMessageOperation");
        throw new Error(
            `Failed to create sendTextMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send text message operation
 */
export async function executeSendTextMessage(
    client: WhatsAppClient,
    params: SendTextMessageParams
): Promise<OperationResult> {
    try {
        const response = await client.sendTextMessage(
            params.phoneNumberId,
            params.to,
            params.text,
            params.previewUrl
        );

        const data: WhatsAppSendResponse = {
            messageId: response.messages[0]?.id || "",
            recipientPhone: response.contacts[0]?.wa_id || params.to,
            status: response.messages[0]?.message_status
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
