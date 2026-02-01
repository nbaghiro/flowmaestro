import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { FacebookClient } from "../client/FacebookClient";
import type { MessengerActionResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Mark as Seen operation schema
 */
export const markAsSeenSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID"),
    recipientId: z.string().describe("The Page-Scoped ID (PSID) of the recipient")
});

export type MarkAsSeenParams = z.infer<typeof markAsSeenSchema>;

/**
 * Mark as Seen operation definition
 */
export const markAsSeenOperation: OperationDefinition = (() => {
    try {
        return {
            id: "markAsSeen",
            name: "Mark as Seen",
            description: "Mark the conversation as seen (shows the blue checkmarks)",
            category: "messaging",
            inputSchema: markAsSeenSchema,
            retryable: true,
            timeout: 5000
        };
    } catch (error) {
        logger.error(
            { component: "Messenger", err: error },
            "Failed to create markAsSeenOperation"
        );
        throw new Error(
            `Failed to create markAsSeen operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute mark as seen operation
 */
export async function executeMarkAsSeen(
    client: FacebookClient,
    params: MarkAsSeenParams
): Promise<OperationResult> {
    try {
        const response = await client.markAsSeen(params.pageId, params.recipientId);

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
                message: error instanceof Error ? error.message : "Failed to mark as seen",
                retryable: true
            }
        };
    }
}
