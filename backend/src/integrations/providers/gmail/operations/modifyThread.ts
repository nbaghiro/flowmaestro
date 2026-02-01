import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Modify thread input schema
 */
export const modifyThreadSchema = z.object({
    threadId: z.string().describe("The ID of the thread to modify"),
    addLabelIds: z
        .array(z.string())
        .optional()
        .describe("Label IDs to add to all messages in the thread"),
    removeLabelIds: z
        .array(z.string())
        .optional()
        .describe("Label IDs to remove from all messages in the thread")
});

export type ModifyThreadParams = z.infer<typeof modifyThreadSchema>;

/**
 * Modify thread operation definition
 */
export const modifyThreadOperation: OperationDefinition = {
    id: "modifyThread",
    name: "Modify Gmail Thread Labels",
    description: "Add or remove labels from all messages in a conversation thread",
    category: "threads",
    retryable: true,
    inputSchema: modifyThreadSchema
};

/**
 * Execute modify thread operation
 */
export async function executeModifyThread(
    client: GmailClient,
    params: ModifyThreadParams
): Promise<OperationResult> {
    try {
        if (
            (!params.addLabelIds || params.addLabelIds.length === 0) &&
            (!params.removeLabelIds || params.removeLabelIds.length === 0)
        ) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "At least one of addLabelIds or removeLabelIds must be specified",
                    retryable: false
                }
            };
        }

        const result = await client.modifyThread(
            params.threadId,
            params.addLabelIds,
            params.removeLabelIds
        );

        return {
            success: true,
            data: {
                threadId: result.id,
                historyId: result.historyId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to modify thread",
                retryable: true
            }
        };
    }
}
