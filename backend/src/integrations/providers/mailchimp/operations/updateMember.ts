import { z } from "zod";
import type { MailchimpMemberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const updateMemberSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    email: z.string().email().describe("The current email address of the member"),
    newEmail: z.string().email().optional().describe("New email address (to change email)"),
    status: z
        .enum(["subscribed", "unsubscribed", "cleaned", "pending", "transactional"])
        .optional()
        .describe("New subscription status"),
    emailType: z.enum(["html", "text"]).optional().describe("Email format preference"),
    firstName: z.string().optional().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    mergeFields: z
        .record(z.unknown())
        .optional()
        .describe("Additional merge fields (key-value pairs)"),
    language: z.string().optional().describe("Language code"),
    vip: z.boolean().optional().describe("VIP status")
});

export type UpdateMemberParams = z.infer<typeof updateMemberSchema>;

export const updateMemberOperation: OperationDefinition = {
    id: "updateMember",
    name: "Update Member",
    description: "Update an existing member in a Mailchimp audience",
    category: "members",
    inputSchema: updateMemberSchema,
    retryable: false,
    timeout: 15000
};

export async function executeUpdateMember(
    client: MailchimpClient,
    params: UpdateMemberParams
): Promise<OperationResult> {
    try {
        const mergeFields: Record<string, unknown> = params.mergeFields || {};
        if (params.firstName !== undefined) mergeFields.FNAME = params.firstName;
        if (params.lastName !== undefined) mergeFields.LNAME = params.lastName;

        const updateData: Parameters<typeof client.updateMember>[2] = {};
        if (params.newEmail) updateData.email_address = params.newEmail;
        if (params.status) updateData.status = params.status;
        if (params.emailType) updateData.email_type = params.emailType;
        if (Object.keys(mergeFields).length > 0) updateData.merge_fields = mergeFields;
        if (params.language) updateData.language = params.language;
        if (params.vip !== undefined) updateData.vip = params.vip;

        const member = await client.updateMember(params.listId, params.email, updateData);

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
                message: error instanceof Error ? error.message : "Failed to update member",
                retryable: false
            }
        };
    }
}
