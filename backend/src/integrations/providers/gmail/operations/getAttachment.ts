import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Get attachment input schema
 */
export const getAttachmentSchema = z.object({
    messageId: z.string().describe("The ID of the message containing the attachment"),
    attachmentId: z.string().describe("The ID of the attachment to retrieve")
});

export type GetAttachmentParams = z.infer<typeof getAttachmentSchema>;

/**
 * Get attachment operation definition
 */
export const getAttachmentOperation: OperationDefinition = {
    id: "getAttachment",
    name: "Get Gmail Attachment",
    description: "Download an attachment from a Gmail message",
    category: "attachments",
    retryable: true,
    inputSchema: getAttachmentSchema
};

/**
 * Execute get attachment operation
 */
export async function executeGetAttachment(
    client: GmailClient,
    params: GetAttachmentParams
): Promise<OperationResult> {
    try {
        const attachment = await client.getAttachment(params.messageId, params.attachmentId);

        return {
            success: true,
            data: {
                size: attachment.size,
                data: attachment.data // base64url encoded content
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get attachment",
                retryable: true
            }
        };
    }
}
