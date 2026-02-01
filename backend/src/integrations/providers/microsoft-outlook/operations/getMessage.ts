import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const getMessageSchema = z.object({
    messageId: z.string().describe("The ID of the message to retrieve")
});

export type GetMessageParams = z.infer<typeof getMessageSchema>;

export const getMessageOperation: OperationDefinition = {
    id: "getMessage",
    name: "Get Message",
    description: "Get a specific email message by ID",
    category: "email",
    inputSchema: getMessageSchema,
    retryable: true
};

export async function executeGetMessage(
    client: MicrosoftOutlookClient,
    params: GetMessageParams
): Promise<OperationResult> {
    try {
        const message = await client.getMessage(params.messageId);
        return {
            success: true,
            data: {
                id: message.id,
                subject: message.subject,
                bodyPreview: message.bodyPreview,
                body: message.body,
                from: message.from?.emailAddress,
                toRecipients: message.toRecipients.map((r) => r.emailAddress),
                ccRecipients: message.ccRecipients?.map((r) => r.emailAddress),
                bccRecipients: message.bccRecipients?.map((r) => r.emailAddress),
                receivedDateTime: message.receivedDateTime,
                sentDateTime: message.sentDateTime,
                isRead: message.isRead,
                isDraft: message.isDraft,
                importance: message.importance,
                hasAttachments: message.hasAttachments,
                webLink: message.webLink
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get message",
                retryable: true
            }
        };
    }
}
