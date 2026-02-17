import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const addToListSchema = z.object({
    listId: z.string().describe("The list ID to add contacts to"),
    contactIds: z.array(z.string()).min(1).describe("Contact IDs to add to the list")
});

export type AddToListParams = z.infer<typeof addToListSchema>;

export const addToListOperation: OperationDefinition = {
    id: "addToList",
    name: "Add to List",
    description: "Add contacts to a list in Constant Contact",
    category: "lists",
    inputSchema: addToListSchema,
    retryable: false,
    timeout: 30000
};

export async function executeAddToList(
    client: ConstantContactClient,
    params: AddToListParams
): Promise<OperationResult> {
    try {
        const response = await client.addContactsToList(params.listId, params.contactIds);

        return {
            success: true,
            data: {
                added: true,
                listId: params.listId,
                contactIds: params.contactIds,
                activityId: response.activity_id
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add contacts to list";
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
