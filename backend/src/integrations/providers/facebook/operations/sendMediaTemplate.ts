import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { FacebookClient } from "../client/FacebookClient";
import type { MessengerSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Button schema
 */
const buttonSchema = z.object({
    type: z.enum(["web_url", "postback"]).describe("Type of button"),
    title: z.string().max(20).describe("Button label (max 20 characters)"),
    url: z.string().url().optional().describe("URL for web_url buttons"),
    payload: z.string().max(1000).optional().describe("Payload for postback buttons")
});

/**
 * Send Media Template operation schema
 */
export const sendMediaTemplateSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID"),
    recipientId: z.string().describe("The Page-Scoped ID (PSID) of the recipient"),
    mediaType: z.enum(["image", "video"]).describe("Type of media"),
    mediaUrl: z.string().url().describe("URL of the media"),
    buttons: z.array(buttonSchema).max(1).optional().describe("Optional button (max 1)"),
    tag: z
        .enum(["CONFIRMED_EVENT_UPDATE", "POST_PURCHASE_UPDATE", "ACCOUNT_UPDATE", "HUMAN_AGENT"])
        .optional()
        .describe("Message tag for sending outside the 24h window")
});

export type SendMediaTemplateParams = z.infer<typeof sendMediaTemplateSchema>;

/**
 * Send Media Template operation definition
 */
export const sendMediaTemplateOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendMediaTemplate",
            name: "Send Media Template",
            description: "Send an image or video with an optional button",
            category: "messaging",
            inputSchema: sendMediaTemplateSchema,
            inputSchemaJSON: toJSONSchema(sendMediaTemplateSchema),
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Messenger", err: error }, "Failed to create sendMediaTemplateOperation");
        throw new Error(
            `Failed to create sendMediaTemplate operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send media template operation
 */
export async function executeSendMediaTemplate(
    client: FacebookClient,
    params: SendMediaTemplateParams
): Promise<OperationResult> {
    try {
        const buttons = params.buttons?.map((btn) => ({
            type: btn.type as "web_url" | "postback",
            title: btn.title,
            url: btn.url,
            payload: btn.payload
        }));

        const response = await client.sendMediaTemplate(
            params.pageId,
            params.recipientId,
            params.mediaType,
            params.mediaUrl,
            buttons,
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
                message: error instanceof Error ? error.message : "Failed to send media template",
                retryable: true
            }
        };
    }
}
