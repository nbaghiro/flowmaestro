import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const forwardMessageSchema = z.object({
    messageId: z.string().describe("ID of the message to forward"),
    to: z.array(z.string().email()).min(1).describe("Email addresses to forward to"),
    comment: z.string().optional().describe("Additional message to include")
});

export type ForwardMessageParams = z.infer<typeof forwardMessageSchema>;

export const forwardMessageOperation: OperationDefinition = {
    id: "forwardMessage",
    name: "Forward Message",
    description: "Forward an email to new recipients",
    category: "email",
    inputSchema: forwardMessageSchema,
    retryable: false // Forward should not auto-retry to avoid duplicates
};

export async function executeForwardMessage(
    client: MicrosoftOutlookClient,
    params: ForwardMessageParams
): Promise<OperationResult> {
    try {
        await client.forwardMessage(params.messageId, params.to, params.comment);
        return {
            success: true,
            data: {
                message: "Message forwarded successfully",
                originalMessageId: params.messageId,
                forwardedTo: params.to
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to forward message",
                retryable: false
            }
        };
    }
}
