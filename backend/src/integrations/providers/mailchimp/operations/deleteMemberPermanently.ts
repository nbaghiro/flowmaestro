import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const deleteMemberPermanentlySchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    email: z.string().email().describe("The email address of the member to permanently delete")
});

export type DeleteMemberPermanentlyParams = z.infer<typeof deleteMemberPermanentlySchema>;

export const deleteMemberPermanentlyOperation: OperationDefinition = {
    id: "deleteMemberPermanently",
    name: "Delete Member Permanently",
    description:
        "Permanently delete a member from a Mailchimp audience. This action cannot be undone and the email cannot be re-added.",
    category: "members",
    inputSchema: deleteMemberPermanentlySchema,
    inputSchemaJSON: toJSONSchema(deleteMemberPermanentlySchema),
    retryable: false,
    timeout: 10000
};

export async function executeDeleteMemberPermanently(
    client: MailchimpClient,
    params: DeleteMemberPermanentlyParams
): Promise<OperationResult> {
    try {
        await client.deleteMemberPermanently(params.listId, params.email);

        return {
            success: true,
            data: {
                deleted: true,
                email: params.email,
                listId: params.listId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to delete member permanently",
                retryable: false
            }
        };
    }
}
