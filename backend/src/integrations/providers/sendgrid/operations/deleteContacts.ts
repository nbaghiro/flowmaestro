import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const deleteContactsSchema = z.object({
    contactIds: z.array(z.string()).min(1).describe("Contact IDs to delete"),
    deleteAllContacts: z.boolean().optional().describe("Delete ALL contacts (use with caution)")
});

export type DeleteContactsParams = z.infer<typeof deleteContactsSchema>;

export const deleteContactsOperation: OperationDefinition = {
    id: "deleteContacts",
    name: "Delete Contacts",
    description: "Delete contacts from SendGrid Marketing (async operation)",
    category: "contacts",
    inputSchema: deleteContactsSchema,
    inputSchemaJSON: toJSONSchema(deleteContactsSchema),
    retryable: false,
    timeout: 30000
};

export async function executeDeleteContacts(
    client: SendGridClient,
    params: DeleteContactsParams
): Promise<OperationResult> {
    try {
        const result = await client.deleteContacts(params.contactIds, params.deleteAllContacts);

        return {
            success: true,
            data: {
                jobId: result.job_id,
                deletedCount: params.deleteAllContacts ? "all" : params.contactIds.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete contacts",
                retryable: false
            }
        };
    }
}
