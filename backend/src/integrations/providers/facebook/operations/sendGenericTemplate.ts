import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { FacebookClient } from "../client/FacebookClient";
import type { MessengerSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

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
 * Generic template element schema (card)
 */
const elementSchema = z.object({
    title: z.string().max(80).describe("Card title (max 80 characters)"),
    subtitle: z.string().max(80).optional().describe("Card subtitle (max 80 characters)"),
    imageUrl: z.string().url().optional().describe("Image URL for the card"),
    defaultActionUrl: z.string().url().optional().describe("URL when card is clicked"),
    buttons: z.array(buttonSchema).max(3).optional().describe("Card buttons (max 3)")
});

/**
 * Send Generic Template operation schema
 */
export const sendGenericTemplateSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID"),
    recipientId: z.string().describe("The Page-Scoped ID (PSID) of the recipient"),
    elements: z
        .array(elementSchema)
        .min(1)
        .max(10)
        .describe("Cards to display (1-10, creates a carousel)"),
    tag: z
        .enum(["CONFIRMED_EVENT_UPDATE", "POST_PURCHASE_UPDATE", "ACCOUNT_UPDATE", "HUMAN_AGENT"])
        .optional()
        .describe("Message tag for sending outside the 24h window")
});

export type SendGenericTemplateParams = z.infer<typeof sendGenericTemplateSchema>;

/**
 * Send Generic Template operation definition
 */
export const sendGenericTemplateOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendGenericTemplate",
            name: "Send Generic Template",
            description:
                "Send a carousel of cards (up to 10) with title, subtitle, image, and buttons",
            category: "messaging",
            inputSchema: sendGenericTemplateSchema,
            inputSchemaJSON: toJSONSchema(sendGenericTemplateSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Messenger", err: error },
            "Failed to create sendGenericTemplateOperation"
        );
        throw new Error(
            `Failed to create sendGenericTemplate operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send generic template operation
 */
export async function executeSendGenericTemplate(
    client: FacebookClient,
    params: SendGenericTemplateParams
): Promise<OperationResult> {
    try {
        const elements = params.elements.map((el) => ({
            title: el.title,
            subtitle: el.subtitle,
            image_url: el.imageUrl,
            default_action: el.defaultActionUrl
                ? {
                      type: "web_url" as const,
                      url: el.defaultActionUrl
                  }
                : undefined,
            buttons: el.buttons?.map((btn) => ({
                type: btn.type as "web_url" | "postback" | "phone_number",
                title: btn.title,
                url: btn.url,
                payload: btn.payload
            }))
        }));

        const response = await client.sendGenericTemplate(
            params.pageId,
            params.recipientId,
            elements,
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
                message: error instanceof Error ? error.message : "Failed to send generic template",
                retryable: true
            }
        };
    }
}
