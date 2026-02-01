import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WhatsAppClient } from "../client/WhatsAppClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Mark as Read operation schema
 */
export const markAsReadSchema = z.object({
    phoneNumberId: z.string().describe("The WhatsApp Business phone number ID"),
    messageId: z.string().describe("The ID of the message to mark as read")
});

export type MarkAsReadParams = z.infer<typeof markAsReadSchema>;

/**
 * Mark as Read operation definition
 */
export const markAsReadOperation: OperationDefinition = (() => {
    try {
        return {
            id: "markAsRead",
            name: "Mark as Read",
            description: "Mark a received message as read (sends read receipt to user)",
            category: "messaging",
            inputSchema: markAsReadSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "WhatsApp", err: error }, "Failed to create markAsReadOperation");
        throw new Error(
            `Failed to create markAsRead operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute mark as read operation
 */
export async function executeMarkAsRead(
    client: WhatsAppClient,
    params: MarkAsReadParams
): Promise<OperationResult> {
    try {
        const response = await client.markAsRead(params.phoneNumberId, params.messageId);

        return {
            success: true,
            data: {
                success: response.success,
                messageId: params.messageId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to mark message as read",
                retryable: true
            }
        };
    }
}
