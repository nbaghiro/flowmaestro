import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { SendGridListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const updateListSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list"),
    name: z.string().min(1).describe("The new name of the list")
});

export type UpdateListParams = z.infer<typeof updateListSchema>;

export const updateListOperation: OperationDefinition = {
    id: "updateList",
    name: "Update List",
    description: "Update the name of a contact list in SendGrid",
    category: "lists",
    inputSchema: updateListSchema,
    inputSchemaJSON: toJSONSchema(updateListSchema),
    retryable: false,
    timeout: 15000
};

export async function executeUpdateList(
    client: SendGridClient,
    params: UpdateListParams
): Promise<OperationResult> {
    try {
        const list = await client.updateList(params.listId, params.name);

        const output: SendGridListOutput = {
            id: list.id,
            name: list.name,
            contactCount: list.contact_count
        };

        return {
            success: true,
            data: output
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update list",
                retryable: false
            }
        };
    }
}
