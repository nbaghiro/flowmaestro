import { z } from "zod";
import type { MailchimpMemberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getMemberSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    email: z.string().email().describe("The email address of the member")
});

export type GetMemberParams = z.infer<typeof getMemberSchema>;

export const getMemberOperation: OperationDefinition = {
    id: "getMember",
    name: "Get Member",
    description: "Get a single member by email from a Mailchimp audience",
    category: "members",
    inputSchema: getMemberSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetMember(
    client: MailchimpClient,
    params: GetMemberParams
): Promise<OperationResult> {
    try {
        const member = await client.getMember(params.listId, params.email);

        const output: MailchimpMemberOutput = {
            id: member.id,
            email: member.email_address,
            status: member.status,
            firstName: member.merge_fields?.FNAME as string | undefined,
            lastName: member.merge_fields?.LNAME as string | undefined,
            fullName: member.full_name,
            mergeFields: member.merge_fields,
            language: member.language,
            vip: member.vip || false,
            memberRating: member.member_rating,
            lastChanged: member.last_changed,
            source: member.source,
            tagsCount: member.tags_count,
            tags: member.tags
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
                message: error instanceof Error ? error.message : "Failed to get member",
                retryable: true
            }
        };
    }
}
