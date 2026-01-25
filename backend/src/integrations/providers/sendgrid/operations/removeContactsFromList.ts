import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const removeContactsFromListSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list"),
    contactIds: z.array(z.string()).min(1).describe("Contact IDs to remove from the list")
});

export type RemoveContactsFromListParams = z.infer<typeof removeContactsFromListSchema>;

export const removeContactsFromListOperation: OperationDefinition = {
    id: "removeContactsFromList",
    name: "Remove Contacts from List",
    description: "Remove contacts from a list in SendGrid (async operation)",
    category: "lists",
    inputSchema: removeContactsFromListSchema,
    inputSchemaJSON: toJSONSchema(removeContactsFromListSchema),
    retryable: false,
    timeout: 30000
};

export async function executeRemoveContactsFromList(
    client: SendGridClient,
    params: RemoveContactsFromListParams
): Promise<OperationResult> {
    try {
        const result = await client.removeContactsFromList(params.listId, params.contactIds);

        return {
            success: true,
            data: {
                jobId: result.job_id,
                listId: params.listId,
                contactCount: params.contactIds.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to remove contacts from list",
                retryable: false
            }
        };
    }
}
