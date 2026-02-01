import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const markAsReadSchema = z.object({
    messageId: z.string().describe("ID of the message"),
    isRead: z.boolean().describe("Read status to set")
});

export type MarkAsReadParams = z.infer<typeof markAsReadSchema>;

export const markAsReadOperation: OperationDefinition = {
    id: "markAsRead",
    name: "Mark as Read/Unread",
    description: "Mark a message as read or unread",
    category: "email",
    inputSchema: markAsReadSchema,
    retryable: true
};

export async function executeMarkAsRead(
    client: MicrosoftOutlookClient,
    params: MarkAsReadParams
): Promise<OperationResult> {
    try {
        const message = await client.markAsRead(params.messageId, params.isRead);
        return {
            success: true,
            data: {
                id: message.id,
                subject: message.subject,
                isRead: message.isRead,
                message: `Message marked as ${params.isRead ? "read" : "unread"}`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update message",
                retryable: true
            }
        };
    }
}
