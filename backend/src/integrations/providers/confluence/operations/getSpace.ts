import { getSpaceInputSchema, type GetSpaceInput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConfluenceClient } from "../client/ConfluenceClient";

export const getSpaceOperation: OperationDefinition = {
    id: "getSpace",
    name: "Get Space",
    description: "Get details of a specific Confluence space",
    category: "spaces",
    inputSchema: getSpaceInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetSpace(
    client: ConfluenceClient,
    params: GetSpaceInput
): Promise<OperationResult> {
    try {
        const response = await client.get<{
            id: string;
            key: string;
            name: string;
            type: string;
            status: string;
            description?: { plain?: { value: string } };
            homepageId?: string;
            _links?: { webui?: string };
        }>(`/wiki/api/v2/spaces/${params.spaceId}`);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get space",
                retryable: true
            }
        };
    }
}
