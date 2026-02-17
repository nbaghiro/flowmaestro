import { z } from "zod";
import type { ConvertKitTagOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const getTagsSchema = z.object({});

export type GetTagsParams = z.infer<typeof getTagsSchema>;

export const getTagsOperation: OperationDefinition = {
    id: "getTags",
    name: "Get Tags",
    description: "Retrieve all tags from ConvertKit",
    category: "tags",
    inputSchema: getTagsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetTags(
    client: ConvertKitClient,
    _params: GetTagsParams
): Promise<OperationResult> {
    try {
        const response = await client.getTags();

        const tags: ConvertKitTagOutput[] = response.tags.map((tag) => ({
            id: String(tag.id),
            name: tag.name,
            createdAt: tag.created_at
        }));

        return {
            success: true,
            data: {
                tags,
                total: tags.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get tags";
        return {
            success: false,
            error: {
                type: message.includes("rate limit") ? "rate_limit" : "server_error",
                message,
                retryable: message.includes("rate limit")
            }
        };
    }
}
