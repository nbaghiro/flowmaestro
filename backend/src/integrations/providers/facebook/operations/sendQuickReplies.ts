import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { FacebookClient } from "../client/FacebookClient";
import type { MessengerSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Quick Reply schema
 */
const quickReplySchema = z.object({
    contentType: z
        .enum(["text", "user_phone_number", "user_email"])
        .default("text")
        .describe("Type of quick reply"),
    title: z
        .string()
        .max(20)
        .optional()
        .describe("Button label (max 20 characters, required for text type)"),
    payload: z
        .string()
        .max(1000)
        .optional()
        .describe("Data sent back when button is clicked (required for text type)"),
    imageUrl: z.string().url().optional().describe("Optional image URL for the button")
});

/**
 * Send Quick Replies operation schema
 */
export const sendQuickRepliesSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID"),
    recipientId: z.string().describe("The Page-Scoped ID (PSID) of the recipient"),
    text: z.string().min(1).max(2000).describe("The text message to accompany the quick replies"),
    quickReplies: z
        .array(quickReplySchema)
        .min(1)
        .max(13)
        .describe("Array of quick reply buttons (max 13)"),
    tag: z
        .enum(["CONFIRMED_EVENT_UPDATE", "POST_PURCHASE_UPDATE", "ACCOUNT_UPDATE", "HUMAN_AGENT"])
        .optional()
        .describe("Message tag for sending outside the 24h window")
});

export type SendQuickRepliesParams = z.infer<typeof sendQuickRepliesSchema>;

/**
 * Send Quick Replies operation definition
 */
export const sendQuickRepliesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendQuickReplies",
            name: "Send Quick Replies",
            description: "Send a message with quick reply buttons to a Messenger user",
            category: "messaging",
            inputSchema: sendQuickRepliesSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Messenger", err: error },
            "Failed to create sendQuickRepliesOperation"
        );
        throw new Error(
            `Failed to create sendQuickReplies operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send quick replies operation
 */
export async function executeSendQuickReplies(
    client: FacebookClient,
    params: SendQuickRepliesParams
): Promise<OperationResult> {
    try {
        const quickReplies = params.quickReplies.map((qr) => ({
            content_type: qr.contentType as "text" | "user_phone_number" | "user_email",
            title: qr.title,
            payload: qr.payload,
            image_url: qr.imageUrl
        }));

        const response = await client.sendQuickReplies(
            params.pageId,
            params.recipientId,
            params.text,
            quickReplies,
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
                message: error instanceof Error ? error.message : "Failed to send quick replies",
                retryable: true
            }
        };
    }
}
