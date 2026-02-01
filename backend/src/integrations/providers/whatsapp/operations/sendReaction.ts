import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WhatsAppClient } from "../client/WhatsAppClient";
import type { WhatsAppSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Send Reaction operation schema
 */
export const sendReactionSchema = z.object({
    phoneNumberId: z.string().describe("The WhatsApp Business phone number ID"),
    to: z.string().describe("The recipient's phone number in E.164 format"),
    messageId: z.string().describe("The ID of the message to react to"),
    emoji: z.string().describe("The emoji to react with (e.g., '👍', '❤️', '😂')")
});

export type SendReactionParams = z.infer<typeof sendReactionSchema>;

/**
 * Send Reaction operation definition
 */
export const sendReactionOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendReaction",
            name: "Send Reaction",
            description: "React to a message with an emoji",
            category: "messaging",
            inputSchema: sendReactionSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "WhatsApp", err: error },
            "Failed to create sendReactionOperation"
        );
        throw new Error(
            `Failed to create sendReaction operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send reaction operation
 */
export async function executeSendReaction(
    client: WhatsAppClient,
    params: SendReactionParams
): Promise<OperationResult> {
    try {
        const response = await client.sendReaction(
            params.phoneNumberId,
            params.to,
            params.messageId,
            params.emoji
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
                message: error instanceof Error ? error.message : "Failed to send reaction",
                retryable: true
            }
        };
    }
}
