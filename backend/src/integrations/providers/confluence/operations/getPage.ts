import { getPageInputSchema, type GetPageInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConfluenceClient } from "../client/ConfluenceClient";

export const getPageOperation: OperationDefinition = {
    id: "getPage",
    name: "Get Page",
    description: "Get details and content of a specific Confluence page",
    category: "pages",
    inputSchema: getPageInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetPage(
    client: ConfluenceClient,
    params: GetPageInput
): Promise<OperationResult> {
    try {
        const queryParams: string[] = [];
        if (params.bodyFormat) queryParams.push(`body-format=${params.bodyFormat}`);

        const query = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
        const response = await client.get<{
            id: string;
            title: string;
            status: string;
            spaceId: string;
            parentId?: string;
            body?: {
                storage?: { value: string; representation: string };
                atlas_doc_format?: { value: string; representation: string };
                view?: { value: string; representation: string };
            };
            version?: { number: number; createdAt: string };
            _links?: { webui?: string; editui?: string };
        }>(`/wiki/api/v2/pages/${params.pageId}${query}`);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get page",
                retryable: true
            }
        };
    }
}
