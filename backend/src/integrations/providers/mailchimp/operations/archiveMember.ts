import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const archiveMemberSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    email: z.string().email().describe("The email address of the member to archive")
});

export type ArchiveMemberParams = z.infer<typeof archiveMemberSchema>;

export const archiveMemberOperation: OperationDefinition = {
    id: "archiveMember",
    name: "Archive Member",
    description:
        "Archive (soft delete) a member from a Mailchimp audience. The member can be re-added later.",
    category: "members",
    inputSchema: archiveMemberSchema,
    inputSchemaJSON: toJSONSchema(archiveMemberSchema),
    retryable: false,
    timeout: 10000
};

export async function executeArchiveMember(
    client: MailchimpClient,
    params: ArchiveMemberParams
): Promise<OperationResult> {
    try {
        await client.archiveMember(params.listId, params.email);

        return {
            success: true,
            data: {
                archived: true,
                email: params.email,
                listId: params.listId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to archive member",
                retryable: false
            }
        };
    }
}
