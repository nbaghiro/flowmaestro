import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Quick Reply schema
 */
const quickReplySchema = z.object({
    title: z.string().max(20).describe("Button label (max 20 characters)"),
    payload: z.string().max(1000).describe("Data sent back when button is clicked"),
    imageUrl: z.string().url().optional().describe("Optional image URL for the button")
});

/**
 * Send Quick Replies operation schema
 */
export const sendQuickRepliesSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID connected to the Instagram account"),
    recipientId: z.string().describe("The Instagram-Scoped ID (IGSID) of the recipient"),
    text: z.string().min(1).max(1000).describe("The text message to accompany the quick replies"),
    quickReplies: z
        .array(quickReplySchema)
        .min(1)
        .max(13)
        .describe("Array of quick reply buttons (max 13)"),
    tag: z
        .enum(["HUMAN_AGENT"])
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
            description: "Send a message with quick reply buttons to an Instagram user",
            category: "messaging",
            inputSchema: sendQuickRepliesSchema,
            inputSchemaJSON: toJSONSchema(sendQuickRepliesSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Instagram", err: error },
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
    client: InstagramClient,
    params: SendQuickRepliesParams
): Promise<OperationResult> {
    try {
        // Transform to API format
        const quickReplies = params.quickReplies.map((qr) => ({
            content_type: "text" as const,
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
                message: error instanceof Error ? error.message : "Failed to send quick replies",
                retryable: true
            }
        };
    }
}
