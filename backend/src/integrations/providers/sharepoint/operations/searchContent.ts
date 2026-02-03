import { searchContentInputSchema, type SearchContentInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SharePointClient } from "../client/SharePointClient";

export const searchContentOperation: OperationDefinition = {
    id: "searchContent",
    name: "Search Content",
    description: "Search across SharePoint sites, lists, and files",
    category: "search",
    inputSchema: searchContentInputSchema,
    retryable: true,
    timeout: 15000
};

export async function executeSearchContent(
    client: SharePointClient,
    params: SearchContentInput
): Promise<OperationResult> {
    try {
        const result = await client.searchContent(params);
        const hitsContainers = result.value?.[0]?.hitsContainers || [];
        const hits = hitsContainers.flatMap((container) => container.hits || []);

        return {
            success: true,
            data: {
                results: hits.map((hit) => ({
                    id: hit.hitId,
                    summary: hit.summary,
                    resource: hit.resource
                })),
                total: hitsContainers.reduce((sum, c) => sum + (c.total || 0), 0)
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search content",
                retryable: true
            }
        };
    }
}
