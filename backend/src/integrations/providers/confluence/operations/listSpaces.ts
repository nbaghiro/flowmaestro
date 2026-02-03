import { listSpacesInputSchema, type ListSpacesInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConfluenceClient } from "../client/ConfluenceClient";

export const listSpacesOperation: OperationDefinition = {
    id: "listSpaces",
    name: "List Spaces",
    description: "List all Confluence spaces the user has access to",
    category: "spaces",
    inputSchema: listSpacesInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListSpaces(
    client: ConfluenceClient,
    params: ListSpacesInput
): Promise<OperationResult> {
    try {
        const queryParams: string[] = [];
        if (params.limit) queryParams.push(`limit=${params.limit}`);
        if (params.cursor) queryParams.push(`cursor=${params.cursor}`);
        if (params.type) queryParams.push(`type=${params.type}`);

        const query = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
        const response = await client.get<{
            results: Array<{
                id: string;
                key: string;
                name: string;
                type: string;
                status: string;
                description?: { plain?: { value: string } };
                _links?: { webui?: string };
            }>;
            _links?: { next?: string };
        }>(`/wiki/api/v2/spaces${query}`);

        return {
            success: true,
            data: {
                spaces: response.results,
                hasMore: !!response._links?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list spaces",
                retryable: true
            }
        };
    }
}
