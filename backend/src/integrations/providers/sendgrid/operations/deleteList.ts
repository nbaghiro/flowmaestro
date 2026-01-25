import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const deleteListSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list to delete"),
    deleteContacts: z
        .boolean()
        .optional()
        .describe("Also delete contacts that are only on this list")
});

export type DeleteListParams = z.infer<typeof deleteListSchema>;

export const deleteListOperation: OperationDefinition = {
    id: "deleteList",
    name: "Delete List",
    description: "Delete a contact list from SendGrid",
    category: "lists",
    inputSchema: deleteListSchema,
    inputSchemaJSON: toJSONSchema(deleteListSchema),
    retryable: false,
    timeout: 15000
};

export async function executeDeleteList(
    client: SendGridClient,
    params: DeleteListParams
): Promise<OperationResult> {
    try {
        await client.deleteList(params.listId, params.deleteContacts);

        return {
            success: true,
            data: {
                deleted: true,
                listId: params.listId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete list",
                retryable: false
            }
        };
    }
}
