import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const removeFromListSchema = z.object({
    listId: z.string().describe("The list ID to remove contacts from"),
    contactIds: z.array(z.string()).min(1).describe("Contact IDs to remove from the list")
});

export type RemoveFromListParams = z.infer<typeof removeFromListSchema>;

export const removeFromListOperation: OperationDefinition = {
    id: "removeFromList",
    name: "Remove from List",
    description: "Remove contacts from a list in Constant Contact",
    category: "lists",
    inputSchema: removeFromListSchema,
    retryable: false,
    timeout: 30000
};

export async function executeRemoveFromList(
    client: ConstantContactClient,
    params: RemoveFromListParams
): Promise<OperationResult> {
    try {
        const response = await client.removeContactsFromList(params.listId, params.contactIds);

        return {
            success: true,
            data: {
                removed: true,
                listId: params.listId,
                contactIds: params.contactIds,
                activityId: response.activity_id
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to remove contacts from list";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
