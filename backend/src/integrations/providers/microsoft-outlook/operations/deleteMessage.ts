import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const deleteMessageSchema = z.object({
    messageId: z.string().describe("ID of the message to delete")
});

export type DeleteMessageParams = z.infer<typeof deleteMessageSchema>;

export const deleteMessageOperation: OperationDefinition = {
    id: "deleteMessage",
    name: "Delete Message",
    description: "Delete an email message",
    category: "email",
    inputSchema: deleteMessageSchema,
    retryable: false // Delete should not auto-retry
};

export async function executeDeleteMessage(
    client: MicrosoftOutlookClient,
    params: DeleteMessageParams
): Promise<OperationResult> {
    try {
        await client.deleteMessage(params.messageId);
        return {
            success: true,
            data: {
                message: "Message deleted successfully",
                messageId: params.messageId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete message",
                retryable: false
            }
        };
    }
}
