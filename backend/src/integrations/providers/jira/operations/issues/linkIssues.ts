import { toJSONSchema } from "../../../../core/schema-utils";
import { linkIssuesInputSchema, type LinkIssuesInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const linkIssuesOperation: OperationDefinition = {
    id: "linkIssues",
    name: "Link Issues",
    description:
        'Create a link between two issues (e.g., "Blocks", "Relates to", "Duplicates"). Optionally add a comment.',
    category: "issues",
    inputSchema: linkIssuesInputSchema,
    inputSchemaJSON: toJSONSchema(linkIssuesInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeLinkIssues(
    client: JiraClient,
    params: LinkIssuesInput
): Promise<OperationResult> {
    try {
        // Build request body
        const requestBody: Record<string, unknown> = {
            type: params.type,
            inwardIssue: params.inwardIssue,
            outwardIssue: params.outwardIssue
        };

        if (params.comment) {
            requestBody.comment = {
                body: params.comment
            };
        }

        // Make API request
        await client.post("/rest/api/3/issueLink", requestBody);

        return {
            success: true,
            data: {
                message: "Issues linked successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to link issues",
                retryable: true
            }
        };
    }
}
