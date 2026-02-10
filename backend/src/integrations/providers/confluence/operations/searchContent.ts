import { searchContentInputSchema, type SearchContentInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConfluenceClient } from "../client/ConfluenceClient";

export const searchContentOperation: OperationDefinition = {
    id: "searchContent",
    name: "Search Content",
    description: "Search Confluence content using CQL (Confluence Query Language)",
    category: "search",
    inputSchema: searchContentInputSchema,
    retryable: true,
    timeout: 15000
};

export async function executeSearchContent(
    client: ConfluenceClient,
    params: SearchContentInput
): Promise<OperationResult> {
    try {
        const queryParams: string[] = [`query=${encodeURIComponent(params.query)}`];
        if (params.limit) queryParams.push(`limit=${params.limit}`);
        if (params.cursor) queryParams.push(`cursor=${params.cursor}`);

        const query = queryParams.join("&");
        const response = await client.get<{
            results: Array<{
                content?: {
                    id: string;
                    title: string;
                    type: string;
                    status: string;
                    spaceId?: string;
                };
                title?: string;
                excerpt?: string;
                url?: string;
            }>;
            _links?: { next?: string };
        }>(`/wiki/api/v2/search?${query}`);

        return {
            success: true,
            data: {
                results: response.results,
                hasMore: !!response._links?.next
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
