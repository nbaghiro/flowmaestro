import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Send Media Message operation schema
 */
export const sendMediaMessageSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID connected to the Instagram account"),
    recipientId: z.string().describe("The Instagram-Scoped ID (IGSID) of the recipient"),
    mediaType: z.enum(["image", "video", "audio"]).describe("Type of media to send"),
    mediaUrl: z.string().url().describe("Public URL of the media file"),
    tag: z
        .enum(["HUMAN_AGENT"])
        .optional()
        .describe("Message tag for sending outside the 24h window")
});

export type SendMediaMessageParams = z.infer<typeof sendMediaMessageSchema>;

/**
 * Send Media Message operation definition
 */
export const sendMediaMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendMediaMessage",
            name: "Send Media Message",
            description: "Send an image, video, or audio message to an Instagram user",
            category: "messaging",
            inputSchema: sendMediaMessageSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Instagram", err: error },
            "Failed to create sendMediaMessageOperation"
        );
        throw new Error(
            `Failed to create sendMediaMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send media message operation
 */
export async function executeSendMediaMessage(
    client: InstagramClient,
    params: SendMediaMessageParams
): Promise<OperationResult> {
    try {
        const response = await client.sendMediaMessage(
            params.pageId,
            params.recipientId,
            params.mediaType,
            params.mediaUrl,
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
                message: error instanceof Error ? error.message : "Failed to send media message",
                retryable: true
            }
        };
    }
}
