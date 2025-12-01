import { toJSONSchema } from "../../../../core/schema-utils";
import { getIssueInputSchema, type GetIssueInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const getIssueOperation: OperationDefinition = {
    id: "getIssue",
    name: "Get Issue",
    description:
        "Get details of a specific issue by ID or key. Supports field filtering and expansion.",
    category: "issues",
    inputSchema: getIssueInputSchema,
    inputSchemaJSON: toJSONSchema(getIssueInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetIssue(
    client: JiraClient,
    params: GetIssueInput
): Promise<OperationResult> {
    try {
        // Build query parameters
        const queryParams: Record<string, unknown> = {};

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        if (params.expand && params.expand.length > 0) {
            queryParams.expand = params.expand.join(",");
        }

        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties.join(",");
        }

        // Make API request
        const issue = await client.get<unknown>(
            `/rest/api/3/issue/${params.issueIdOrKey}`,
            queryParams
        );

        return {
            success: true,
            data: issue
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get issue",
                retryable: true
            }
        };
    }
}
