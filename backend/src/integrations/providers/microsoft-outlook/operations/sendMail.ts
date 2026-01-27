import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const sendMailSchema = z.object({
    to: z.array(z.string().email()).min(1).describe("Array of recipient email addresses"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body content"),
    bodyType: z
        .enum(["text", "html"])
        .optional()
        .default("html")
        .describe("Content type: 'text' or 'html'"),
    cc: z.array(z.string().email()).optional().describe("CC recipients"),
    bcc: z.array(z.string().email()).optional().describe("BCC recipients"),
    importance: z
        .enum(["low", "normal", "high"])
        .optional()
        .default("normal")
        .describe("Email importance level"),
    saveToSentItems: z.boolean().optional().default(true).describe("Save to Sent folder")
});

export type SendMailParams = z.infer<typeof sendMailSchema>;

export const sendMailOperation: OperationDefinition = {
    id: "sendMail",
    name: "Send Email",
    description: "Send an email message",
    category: "email",
    inputSchema: sendMailSchema,
    inputSchemaJSON: {
        type: "object",
        required: ["to", "subject", "body"],
        properties: {
            to: {
                type: "array",
                items: { type: "string", format: "email" },
                minItems: 1,
                description: "Array of recipient email addresses"
            },
            subject: {
                type: "string",
                description: "Email subject"
            },
            body: {
                type: "string",
                description: "Email body content"
            },
            bodyType: {
                type: "string",
                enum: ["text", "html"],
                default: "html",
                description: "Content type: 'text' or 'html'"
            },
            cc: {
                type: "array",
                items: { type: "string", format: "email" },
                description: "CC recipients"
            },
            bcc: {
                type: "array",
                items: { type: "string", format: "email" },
                description: "BCC recipients"
            },
            importance: {
                type: "string",
                enum: ["low", "normal", "high"],
                default: "normal",
                description: "Email importance level"
            },
            saveToSentItems: {
                type: "boolean",
                default: true,
                description: "Save to Sent folder"
            }
        }
    },
    retryable: false // Email sending should not auto-retry to avoid duplicates
};

export async function executeSendMail(
    client: MicrosoftOutlookClient,
    params: SendMailParams
): Promise<OperationResult> {
    try {
        await client.sendMail({
            to: params.to,
            subject: params.subject,
            body: params.body,
            bodyType: params.bodyType,
            cc: params.cc,
            bcc: params.bcc,
            importance: params.importance,
            saveToSentItems: params.saveToSentItems
        });
        return {
            success: true,
            data: {
                message: "Email sent successfully",
                recipients: params.to,
                subject: params.subject
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send email",
                retryable: false
            }
        };
    }
}
