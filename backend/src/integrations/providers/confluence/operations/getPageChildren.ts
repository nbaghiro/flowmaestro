import { getPageChildrenInputSchema, type GetPageChildrenInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConfluenceClient } from "../client/ConfluenceClient";

export const getPageChildrenOperation: OperationDefinition = {
    id: "getPageChildren",
    name: "Get Page Children",
    description: "Get child pages of a specific Confluence page",
    category: "pages",
    inputSchema: getPageChildrenInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetPageChildren(
    client: ConfluenceClient,
    params: GetPageChildrenInput
): Promise<OperationResult> {
    try {
        const queryParams: string[] = [];
        if (params.limit) queryParams.push(`limit=${params.limit}`);
        if (params.cursor) queryParams.push(`cursor=${params.cursor}`);

        const query = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
        const response = await client.get<{
            results: Array<{
                id: string;
                title: string;
                status: string;
                spaceId: string;
                childPosition?: number;
                _links?: { webui?: string };
            }>;
            _links?: { next?: string };
        }>(`/wiki/api/v2/pages/${params.pageId}/children${query}`);

        return {
            success: true,
            data: {
                children: response.results,
                hasMore: !!response._links?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get page children",
                retryable: true
            }
        };
    }
}
