import { z } from "zod";
import type { MailchimpMemberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const addMemberSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    email: z.string().email().describe("The email address of the new member"),
    status: z
        .enum(["subscribed", "unsubscribed", "cleaned", "pending", "transactional"])
        .describe("Subscription status for the member"),
    emailType: z.enum(["html", "text"]).optional().describe("Email format preference"),
    firstName: z.string().optional().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    mergeFields: z
        .record(z.unknown())
        .optional()
        .describe("Additional merge fields (key-value pairs)"),
    language: z.string().optional().describe("Language code (e.g., en)"),
    vip: z.boolean().optional().describe("VIP status"),
    tags: z.array(z.string()).optional().describe("Tags to add to the member")
});

export type AddMemberParams = z.infer<typeof addMemberSchema>;

export const addMemberOperation: OperationDefinition = {
    id: "addMember",
    name: "Add Member",
    description: "Add a new member to a Mailchimp audience (list)",
    category: "members",
    inputSchema: addMemberSchema,
    retryable: false,
    timeout: 15000
};

export async function executeAddMember(
    client: MailchimpClient,
    params: AddMemberParams
): Promise<OperationResult> {
    try {
        const mergeFields: Record<string, unknown> = params.mergeFields || {};
        if (params.firstName) mergeFields.FNAME = params.firstName;
        if (params.lastName) mergeFields.LNAME = params.lastName;

        const member = await client.addMember(params.listId, {
            email_address: params.email,
            status: params.status,
            email_type: params.emailType,
            merge_fields: Object.keys(mergeFields).length > 0 ? mergeFields : undefined,
            language: params.language,
            vip: params.vip,
            tags: params.tags
        });

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
                message: error instanceof Error ? error.message : "Failed to add member",
                retryable: false
            }
        };
    }
}
