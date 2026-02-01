import { z } from "zod";
import type { MailchimpMemberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getSegmentMembersSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    segmentId: z.number().int().positive().describe("The unique ID of the segment"),
    count: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Number of members to return (max 1000)"),
    offset: z.number().min(0).optional().describe("Number of members to skip")
});

export type GetSegmentMembersParams = z.infer<typeof getSegmentMembersSchema>;

export const getSegmentMembersOperation: OperationDefinition = {
    id: "getSegmentMembers",
    name: "Get Segment Members",
    description: "Get all members in a Mailchimp segment",
    category: "segments",
    inputSchema: getSegmentMembersSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetSegmentMembers(
    client: MailchimpClient,
    params: GetSegmentMembersParams
): Promise<OperationResult> {
    try {
        const response = await client.getSegmentMembers(params.listId, params.segmentId, {
            count: params.count,
            offset: params.offset
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
                message: error instanceof Error ? error.message : "Failed to get segment members",
                retryable: true
            }
        };
    }
}
