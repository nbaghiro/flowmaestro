import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { MailchimpTagOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getTagsSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    count: z.number().min(1).max(1000).optional().describe("Number of tags to return (max 1000)"),
    offset: z.number().min(0).optional().describe("Number of tags to skip")
});

export type GetTagsParams = z.infer<typeof getTagsSchema>;

export const getTagsOperation: OperationDefinition = {
    id: "getTags",
    name: "Get Tags",
    description: "Get all tags from a Mailchimp audience",
    category: "tags",
    inputSchema: getTagsSchema,
    inputSchemaJSON: toJSONSchema(getTagsSchema),
    retryable: true,
    timeout: 15000
};

export async function executeGetTags(
    client: MailchimpClient,
    params: GetTagsParams
): Promise<OperationResult> {
    try {
        const response = await client.getTags(params.listId, {
            count: params.count,
            offset: params.offset
        });

        const tags: MailchimpTagOutput[] = response.tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            memberCount: tag.member_count
        }));

        return {
            success: true,
            data: {
                tags,
                totalItems: response.total_items,
                hasMore: (params.offset || 0) + tags.length < response.total_items
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get tags",
                retryable: true
            }
        };
    }
}
