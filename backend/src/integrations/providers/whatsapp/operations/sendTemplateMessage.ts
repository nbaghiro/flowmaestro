import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { WhatsAppClient } from "../client/WhatsAppClient";
import type { WhatsAppSendResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Template component parameter schema
 */
const templateParameterSchema = z.object({
    type: z.enum(["text", "currency", "date_time", "image", "document", "video"]),
    text: z.string().optional(),
    currency: z
        .object({
            fallback_value: z.string(),
            code: z.string(),
            amount_1000: z.number()
        })
        .optional(),
    date_time: z
        .object({
            fallback_value: z.string()
        })
        .optional(),
    image: z
        .object({
            link: z.string().optional(),
            id: z.string().optional()
        })
        .optional(),
    document: z
        .object({
            link: z.string().optional(),
            id: z.string().optional(),
            filename: z.string().optional()
        })
        .optional(),
    video: z
        .object({
            link: z.string().optional(),
            id: z.string().optional()
        })
        .optional()
});

/**
 * Template component schema
 */
const templateComponentSchema = z.object({
    type: z.enum(["header", "body", "button"]),
    parameters: z.array(templateParameterSchema).optional(),
    sub_type: z.enum(["quick_reply", "url"]).optional(),
    index: z.number().optional()
});

/**
 * Send Template Message operation schema
 */
export const sendTemplateMessageSchema = z.object({
    phoneNumberId: z.string().describe("The WhatsApp Business phone number ID to send from"),
    to: z.string().describe("The recipient's phone number in E.164 format"),
    templateName: z.string().describe("The name of the approved message template"),
    languageCode: z.string().describe("The language code for the template (e.g., 'en_US')"),
    components: z
        .array(templateComponentSchema)
        .optional()
        .describe("Template components with parameters")
});

export type SendTemplateMessageParams = z.infer<typeof sendTemplateMessageSchema>;

/**
 * Send Template Message operation definition
 */
export const sendTemplateMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendTemplateMessage",
            name: "Send Template Message",
            description:
                "Send a pre-approved message template to a WhatsApp user (required for initiating conversations)",
            category: "messaging",
            inputSchema: sendTemplateMessageSchema,
            inputSchemaJSON: toJSONSchema(sendTemplateMessageSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "WhatsApp", err: error },
            "Failed to create sendTemplateMessageOperation"
        );
        throw new Error(
            `Failed to create sendTemplateMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send template message operation
 */
export async function executeSendTemplateMessage(
    client: WhatsAppClient,
    params: SendTemplateMessageParams
): Promise<OperationResult> {
    try {
        const response = await client.sendTemplateMessage(
            params.phoneNumberId,
            params.to,
            params.templateName,
            params.languageCode,
            params.components
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
                message: error instanceof Error ? error.message : "Failed to send template message",
                retryable: true
            }
        };
    }
}
