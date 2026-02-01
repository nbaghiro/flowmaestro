import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Remove from List Parameters
 */
export const removeFromListSchema = z.object({
    listId: z.number().describe("The ID of the static list"),
    leadIds: z
        .array(z.number())
        .min(1)
        .max(300)
        .describe("Lead IDs to remove from the list (max 300)")
});

export type RemoveFromListParams = z.infer<typeof removeFromListSchema>;

/**
 * Operation Definition
 */
export const removeFromListOperation: OperationDefinition = {
    id: "removeFromList",
    name: "Remove from List",
    description: "Remove leads from a static list in Marketo",
    category: "lists",
    actionType: "write",
    inputSchema: removeFromListSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Remove from List
 */
export async function executeRemoveFromList(
    client: MarketoClient,
    params: RemoveFromListParams
): Promise<OperationResult> {
    try {
        const response = await client.removeFromList(params.listId, params.leadIds);

        if (!response.success) {
            const errorMessage =
                response.errors?.[0]?.message || "Failed to remove leads from list in Marketo";
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        // Count results
        const results = response.result || [];
        const removed = results.filter((r) => r.status === "removed").length;
        const notMember = results.filter((r) => r.status === "notmemberof").length;
        const skipped = results.filter((r) => r.status === "skipped").length;

        return {
            success: true,
            data: {
                listId: params.listId,
                results,
                summary: {
                    total: params.leadIds.length,
                    removed,
                    notMember,
                    skipped
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to remove leads from list",
                retryable: false
            }
        };
    }
}
