import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FrontClient } from "../client/FrontClient";

export const sendReplySchema = z.object({
    conversationId: z.string().describe("The conversation ID to reply to"),
    body: z.string().min(1).describe("The message body (HTML or plain text)"),
    to: z.array(z.string()).optional().describe("Override TO recipients"),
    cc: z.array(z.string()).optional().describe("CC recipients"),
    bcc: z.array(z.string()).optional().describe("BCC recipients"),
    subject: z.string().optional().describe("Override subject line"),
    authorId: z.string().optional().describe("Teammate ID to send as"),
    channelId: z.string().optional().describe("Channel ID to send through"),
    tagIds: z.array(z.string()).optional().describe("Tag IDs to apply to the conversation"),
    archive: z.boolean().optional().describe("Archive the conversation after sending")
});

export type SendReplyParams = z.infer<typeof sendReplySchema>;

export const sendReplyOperation: OperationDefinition = {
    id: "sendReply",
    name: "Send Reply",
    description: "Send a reply to an existing conversation",
    category: "messaging",
    inputSchema: sendReplySchema,
    retryable: false,
    timeout: 30000
};

export async function executeSendReply(
    client: FrontClient,
    params: SendReplyParams
): Promise<OperationResult> {
    try {
        const message = await client.sendReply(params.conversationId, {
            body: params.body,
            to: params.to,
            cc: params.cc,
            bcc: params.bcc,
            subject: params.subject,
            author_id: params.authorId,
            channel_id: params.channelId,
            options: {
                tag_ids: params.tagIds,
                archive: params.archive
            }
        });

        return {
            success: true,
            data: {
                messageId: message.id,
                type: message.type,
                isInbound: message.is_inbound,
                createdAt: new Date(message.created_at * 1000).toISOString(),
                blurb: message.blurb,
                recipients: message.recipients.map((r) => ({
                    handle: r.handle,
                    role: r.role
                }))
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to send reply";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message: errorMessage,
                retryable: !isNotFound
            }
        };
    }
}
