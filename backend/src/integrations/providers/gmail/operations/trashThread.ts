import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GmailClient } from "../client/GmailClient";

/**
 * Trash thread input schema
 */
export const trashThreadSchema = z.object({
    threadId: z.string().describe("The ID of the thread to move to trash")
});

export type TrashThreadParams = z.infer<typeof trashThreadSchema>;

/**
 * Trash thread operation definition
 */
export const trashThreadOperation: OperationDefinition = {
    id: "trashThread",
    name: "Trash Gmail Thread",
    description:
        "Move an entire conversation thread to the trash folder (can be recovered within 30 days)",
    category: "threads",
    retryable: true,
    inputSchema: trashThreadSchema
};

/**
 * Execute trash thread operation
 */
export async function executeTrashThread(
    client: GmailClient,
    params: TrashThreadParams
): Promise<OperationResult> {
    try {
        const result = await client.trashThread(params.threadId);

        return {
            success: true,
            data: {
                threadId: result.id,
                historyId: result.historyId,
                trashed: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to trash thread",
                retryable: true
            }
        };
    }
}
