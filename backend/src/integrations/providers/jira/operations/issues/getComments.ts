import { toJSONSchema } from "../../../../core/schema-utils";
import { getCommentsInputSchema, type GetCommentsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const getCommentsOperation: OperationDefinition = {
    id: "getComments",
    name: "Get Comments",
    description: "Get all comments for an issue with pagination support.",
    category: "issues",
    inputSchema: getCommentsInputSchema,
    inputSchemaJSON: toJSONSchema(getCommentsInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetComments(
    client: JiraClient,
    params: GetCommentsInput
): Promise<OperationResult> {
    try {
        // Build query parameters
        const queryParams: Record<string, unknown> = {
            startAt: params.startAt,
            maxResults: params.maxResults
        };

        if (params.orderBy) {
            queryParams.orderBy = params.orderBy;
        }

        // Make API request
        const response = await client.get<{
            comments: unknown[];
            total: number;
            startAt: number;
            maxResults: number;
        }>(`/rest/api/3/issue/${params.issueIdOrKey}/comment`, queryParams);

        return {
            success: true,
            data: {
                comments: response.comments,
                total: response.total,
                startAt: response.startAt,
                maxResults: response.maxResults
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get comments",
                retryable: true
            }
        };
    }
}
