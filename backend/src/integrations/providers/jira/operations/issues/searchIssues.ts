import { searchIssuesInputSchema, type SearchIssuesInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const searchIssuesOperation: OperationDefinition = {
    id: "searchIssues",
    name: "Search Issues (JQL)",
    description:
        "Search for issues using JQL (Jira Query Language). Supports pagination, field filtering, and result expansion.",
    category: "search",
    inputSchema: searchIssuesInputSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchIssues(
    client: JiraClient,
    params: SearchIssuesInput
): Promise<OperationResult> {
    try {
        // Build request body
        const requestBody: Record<string, unknown> = {
            jql: params.jql,
            startAt: params.startAt,
            maxResults: params.maxResults
        };

        if (params.fields && params.fields.length > 0) {
            requestBody.fields = params.fields;
        }

        if (params.expand && params.expand.length > 0) {
            requestBody.expand = params.expand;
        }

        if (params.validateQuery !== undefined) {
            requestBody.validateQuery = params.validateQuery;
        }

        // Make API request
        const response = await client.post<{
            issues: unknown[];
            total: number;
            startAt: number;
            maxResults: number;
        }>("/rest/api/3/search", requestBody);

        return {
            success: true,
            data: {
                issues: response.issues,
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
                message: error instanceof Error ? error.message : "Failed to search issues",
                retryable: true
            }
        };
    }
}
