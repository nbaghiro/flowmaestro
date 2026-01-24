import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseEmailActivity } from "../types";

/**
 * Send Email Parameters
 */
export const sendEmailSchema = z.object({
    lead_id: z.string().describe("Lead ID to send email to (required)"),
    contact_id: z.string().optional().describe("Contact ID for the recipient"),
    subject: z.string().min(1).describe("Email subject (required)"),
    body_text: z.string().optional().describe("Plain text email body"),
    body_html: z.string().optional().describe("HTML email body"),
    to: z.array(z.string().email()).min(1).describe("Recipient email addresses (required)"),
    cc: z.array(z.string().email()).optional().describe("CC email addresses"),
    bcc: z.array(z.string().email()).optional().describe("BCC email addresses"),
    template_id: z.string().optional().describe("Email template ID to use"),
    status: z
        .enum(["draft", "outbox", "sent"])
        .optional()
        .default("outbox")
        .describe("Email status")
});

export type SendEmailParams = z.infer<typeof sendEmailSchema>;

/**
 * Operation Definition
 */
export const sendEmailOperation: OperationDefinition = {
    id: "sendEmail",
    name: "Send Email",
    description: "Send an email via Close",
    category: "communication",
    inputSchema: sendEmailSchema,
    inputSchemaJSON: toJSONSchema(sendEmailSchema),
    retryable: false,
    timeout: 15000
};

/**
 * Execute Send Email
 */
export async function executeSendEmail(
    client: CloseClient,
    params: SendEmailParams
): Promise<OperationResult> {
    try {
        const response = await client.post<CloseEmailActivity>("/activity/email/", params);

        return {
            success: true,
            data: response
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
