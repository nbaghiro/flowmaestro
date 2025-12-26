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
    type: z.enum(["web_url", "postback", "phone_number"]).describe("Type of button"),
    title: z.string().max(20).describe("Button label (max 20 characters)"),
    url: z.string().url().optional().describe("URL for web_url buttons"),
    payload: z.string().max(1000).optional().describe("Payload for postback buttons")
});

/**
 * Send Button Template operation schema
 */
export const sendButtonTemplateSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID"),
    recipientId: z.string().describe("The Page-Scoped ID (PSID) of the recipient"),
    text: z.string().min(1).max(640).describe("The text to display above the buttons"),
    buttons: z.array(buttonSchema).min(1).max(3).describe("Array of buttons (1-3)"),
    tag: z
        .enum(["CONFIRMED_EVENT_UPDATE", "POST_PURCHASE_UPDATE", "ACCOUNT_UPDATE", "HUMAN_AGENT"])
        .optional()
        .describe("Message tag for sending outside the 24h window")
});

export type SendButtonTemplateParams = z.infer<typeof sendButtonTemplateSchema>;

/**
 * Send Button Template operation definition
 */
export const sendButtonTemplateOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendButtonTemplate",
            name: "Send Button Template",
            description: "Send a message with up to 3 buttons to a Messenger user",
            category: "messaging",
            inputSchema: sendButtonTemplateSchema,
            inputSchemaJSON: toJSONSchema(sendButtonTemplateSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Messenger", err: error }, "Failed to create sendButtonTemplateOperation");
        throw new Error(
            `Failed to create sendButtonTemplate operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send button template operation
 */
export async function executeSendButtonTemplate(
    client: FacebookClient,
    params: SendButtonTemplateParams
): Promise<OperationResult> {
    try {
        const buttons = params.buttons.map((btn) => ({
            type: btn.type as "web_url" | "postback" | "phone_number",
            title: btn.title,
            url: btn.url,
            payload: btn.payload
        }));

        const response = await client.sendButtonTemplate(
            params.pageId,
            params.recipientId,
            params.text,
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
                message: error instanceof Error ? error.message : "Failed to send button template",
                retryable: true
            }
        };
    }
}
