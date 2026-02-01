import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { FacebookClient } from "../client/FacebookClient";
import type { MessengerActionResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Send Typing Indicator operation schema
 */
export const sendTypingIndicatorSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID"),
    recipientId: z.string().describe("The Page-Scoped ID (PSID) of the recipient"),
    on: z.boolean().describe("Whether to turn the typing indicator on or off")
});

export type SendTypingIndicatorParams = z.infer<typeof sendTypingIndicatorSchema>;

/**
 * Send Typing Indicator operation definition
 */
export const sendTypingIndicatorOperation: OperationDefinition = (() => {
    try {
        return {
            id: "sendTypingIndicator",
            name: "Send Typing Indicator",
            description: "Show or hide the typing indicator (three dots) in the conversation",
            category: "messaging",
            inputSchema: sendTypingIndicatorSchema,
            retryable: true,
            timeout: 5000
        };
    } catch (error) {
        logger.error(
            { component: "Messenger", err: error },
            "Failed to create sendTypingIndicatorOperation"
        );
        throw new Error(
            `Failed to create sendTypingIndicator operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute send typing indicator operation
 */
export async function executeSendTypingIndicator(
    client: FacebookClient,
    params: SendTypingIndicatorParams
): Promise<OperationResult> {
    try {
        const response = await client.sendTypingIndicator(
            params.pageId,
            params.recipientId,
            params.on
        );

        const data: MessengerActionResponse = {
            success: true,
            recipientId: response.recipient_id
        };

        return {
            success: true,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send typing indicator",
                retryable: true
            }
        };
    }
}
