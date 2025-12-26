import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { WhatsAppClient } from "../client/WhatsAppClient";
import type { WhatsAppSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Send Media Message operation schema
 */
export const sendMediaMessageSchema = z
    .object({
        phoneNumberId: z.string().describe("The WhatsApp Business phone number ID to send from"),
        to: z.string().describe("The recipient's phone number in E.164 format"),
        mediaType: z
            .enum(["image", "video", "audio", "document", "sticker"])
            .describe("The type of media to send"),
        mediaUrl: z.string().url().optional().describe("Public URL of the media file"),
        mediaId: z.string().optional().describe("WhatsApp media ID (from uploaded media)"),
        caption: z
            .string()
            .max(1024)
            .optional()
            .describe("Caption for the media (not supported for audio/sticker)"),
        filename: z.string().optional().describe("Filename for documents")
    })
    .refine((data) => data.mediaUrl || data.mediaId, {
        message: "Either mediaUrl or mediaId must be provided"
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
            description: "Send an image, video, audio, document, or sticker to a WhatsApp user",
            category: "messaging",
            inputSchema: sendMediaMessageSchema,
            inputSchemaJSON: toJSONSchema(sendMediaMessageSchema),
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "WhatsApp", err: error }, "Failed to create sendMediaMessageOperation");
        throw new Error(
            `Failed to create sendMediaMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send media message operation
 */
export async function executeSendMediaMessage(
    client: WhatsAppClient,
    params: SendMediaMessageParams
): Promise<OperationResult> {
    try {
        const mediaOptions = {
            link: params.mediaUrl,
            id: params.mediaId,
            caption: params.caption,
            filename: params.filename
        };

        let response;

        switch (params.mediaType) {
            case "image":
                response = await client.sendImageMessage(
                    params.phoneNumberId,
                    params.to,
                    mediaOptions
                );
                break;
            case "video":
                response = await client.sendVideoMessage(
                    params.phoneNumberId,
                    params.to,
                    mediaOptions
                );
                break;
            case "audio":
                response = await client.sendAudioMessage(params.phoneNumberId, params.to, {
                    link: params.mediaUrl,
                    id: params.mediaId
                });
                break;
            case "document":
                response = await client.sendDocumentMessage(
                    params.phoneNumberId,
                    params.to,
                    mediaOptions
                );
                break;
            case "sticker":
                response = await client.sendStickerMessage(params.phoneNumberId, params.to, {
                    link: params.mediaUrl,
                    id: params.mediaId
                });
                break;
        }

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
                message: error instanceof Error ? error.message : "Failed to send media message",
                retryable: true
            }
        };
    }
}
