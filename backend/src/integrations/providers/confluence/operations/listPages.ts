import { listPagesInputSchema, type ListPagesInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConfluenceClient } from "../client/ConfluenceClient";

export const listPagesOperation: OperationDefinition = {
    id: "listPages",
    name: "List Pages",
    description: "List Confluence pages, optionally filtered by space",
    category: "pages",
    inputSchema: listPagesInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListPages(
    client: ConfluenceClient,
    params: ListPagesInput
): Promise<OperationResult> {
    try {
        const queryParams: string[] = [];
        if (params.spaceId) queryParams.push(`space-id=${params.spaceId}`);
        if (params.limit) queryParams.push(`limit=${params.limit}`);
        if (params.cursor) queryParams.push(`cursor=${params.cursor}`);
        if (params.status) queryParams.push(`status=${params.status}`);

        const query = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
        const response = await client.get<{
            results: Array<{
                id: string;
                title: string;
                status: string;
                spaceId: string;
                parentId?: string;
                version?: { number: number };
                _links?: { webui?: string };
            }>;
            _links?: { next?: string };
        }>(`/wiki/api/v2/pages${query}`);

        return {
            success: true,
            data: {
                pages: response.results,
                hasMore: !!response._links?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list pages",
                retryable: true
            }
        };
    }
}
