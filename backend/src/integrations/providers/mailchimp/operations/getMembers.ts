import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { MailchimpMemberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getMembersSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    count: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Number of members to return (max 1000)"),
    offset: z.number().min(0).optional().describe("Number of members to skip"),
    status: z
        .enum(["subscribed", "unsubscribed", "cleaned", "pending", "transactional", "archived"])
        .optional()
        .describe("Filter by subscription status"),
    sinceLastChanged: z
        .string()
        .optional()
        .describe("Filter members changed since this date (ISO 8601)")
});

export type GetMembersParams = z.infer<typeof getMembersSchema>;

export const getMembersOperation: OperationDefinition = {
    id: "getMembers",
    name: "Get Members",
    description: "Get members from a Mailchimp audience (list)",
    category: "members",
    inputSchema: getMembersSchema,
    inputSchemaJSON: toJSONSchema(getMembersSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetMembers(
    client: MailchimpClient,
    params: GetMembersParams
): Promise<OperationResult> {
    try {
        const response = await client.getMembers(params.listId, {
            count: params.count,
            offset: params.offset,
            status: params.status,
            since_last_changed: params.sinceLastChanged
        });

        const members: MailchimpMemberOutput[] = response.members.map((member) => ({
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
        }));

        return {
            success: true,
            data: {
                members,
                totalItems: response.total_items,
                hasMore: (params.offset || 0) + members.length < response.total_items
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get members",
                retryable: true
            }
        };
    }
}
