import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const moveMessageSchema = z.object({
    messageId: z.string().describe("ID of the message to move"),
    destinationFolderId: z.string().describe("ID of the destination folder")
});

export type MoveMessageParams = z.infer<typeof moveMessageSchema>;

export const moveMessageOperation: OperationDefinition = {
    id: "moveMessage",
    name: "Move Message",
    description: "Move a message to another folder",
    category: "email",
    inputSchema: moveMessageSchema,
    retryable: true
};

export async function executeMoveMessage(
    client: MicrosoftOutlookClient,
    params: MoveMessageParams
): Promise<OperationResult> {
    try {
        const message = await client.moveMessage(params.messageId, params.destinationFolderId);
        return {
            success: true,
            data: {
                id: message.id,
                subject: message.subject,
                message: "Message moved successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to move message",
                retryable: true
            }
        };
    }
}
