import { z } from "zod";
import type { ActiveCampaignTagOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const getTagsSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of tags to return (max 100)"),
    offset: z.number().min(0).optional().describe("Number of tags to skip"),
    search: z.string().optional().describe("Search tags by name")
});

export type GetTagsParams = z.infer<typeof getTagsSchema>;

export const getTagsOperation: OperationDefinition = {
    id: "getTags",
    name: "Get Tags",
    description: "Get all tags from ActiveCampaign",
    category: "tags",
    inputSchema: getTagsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetTags(
    client: ActiveCampaignClient,
    params: GetTagsParams
): Promise<OperationResult> {
    try {
        const response = await client.getTags({
            limit: params.limit,
            offset: params.offset,
            search: params.search
        });

        const tags: ActiveCampaignTagOutput[] = response.tags.map((tag) => ({
            id: tag.id,
            name: tag.tag,
            type: tag.tagType,
            description: tag.description,
            subscriberCount: tag.subscriber_count ? parseInt(tag.subscriber_count, 10) : undefined,
            createdAt: tag.cdate
        }));

        return {
            success: true,
            data: {
                tags,
                total: parseInt(response.meta.total, 10),
                hasMore: tags.length === (params.limit || 20)
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
