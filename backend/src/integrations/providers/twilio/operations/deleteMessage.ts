import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TwilioClient } from "../client/TwilioClient";

export const deleteMessageSchema = z.object({
    messageSid: z.string().min(1).describe("The SID of the message to delete")
});

export type DeleteMessageParams = z.infer<typeof deleteMessageSchema>;

export const deleteMessageOperation: OperationDefinition = {
    id: "deleteMessage",
    name: "Delete Message",
    description: "Delete an SMS message by SID",
    category: "messaging",
    inputSchema: deleteMessageSchema,
    retryable: false,
    timeout: 30000
};

export async function executeDeleteMessage(
    client: TwilioClient,
    params: DeleteMessageParams
): Promise<OperationResult> {
    try {
        await client.deleteMessage(params.messageSid);

        return {
            success: true,
            data: {
                deleted: true,
                messageSid: params.messageSid
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete message";

        // Check for not found error
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Message not found",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: false
            }
        };
    }
}
