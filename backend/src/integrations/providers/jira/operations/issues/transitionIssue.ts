import { transitionIssueInputSchema, type TransitionIssueInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const transitionIssueOperation: OperationDefinition = {
    id: "transitionIssue",
    name: "Transition Issue",
    description:
        "Transition an issue to a new status (e.g., To Do -> In Progress -> Done). Use getTransitions to get available transition IDs.",
    category: "issues",
    inputSchema: transitionIssueInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeTransitionIssue(
    client: JiraClient,
    params: TransitionIssueInput
): Promise<OperationResult> {
    try {
        // Build request body
        const requestBody: Record<string, unknown> = {
            transition: {
                id: params.transitionId
            }
        };

        if (params.fields) {
            requestBody.fields = params.fields;
        }

        if (params.comment) {
            requestBody.update = {
                comment: [
                    {
                        add: {
                            body: params.comment
                        }
                    }
                ]
            };
        }

        // Make API request
        await client.post(`/rest/api/3/issue/${params.issueIdOrKey}/transitions`, requestBody);

        return {
            success: true,
            data: {
                message: "Issue transitioned successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to transition issue",
                retryable: true
            }
        };
    }
}
