import { createIssueInputSchema, type CreateIssueInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const createIssueOperation: OperationDefinition = {
    id: "createIssue",
    name: "Create Issue",
    description:
        "Create a new issue in Jira. Supports standard fields and custom fields via customFields parameter.",
    category: "issues",
    inputSchema: createIssueInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeCreateIssue(
    client: JiraClient,
    params: CreateIssueInput
): Promise<OperationResult> {
    try {
        // Build fields object for Jira API
        const fields: Record<string, unknown> = {
            project: params.project,
            issuetype: params.issuetype,
            summary: params.summary
        };

        // Add optional standard fields
        if (params.description) {
            fields.description = params.description;
        }

        if (params.assignee) {
            fields.assignee = params.assignee;
        }

        if (params.priority) {
            fields.priority = params.priority;
        }

        if (params.labels && params.labels.length > 0) {
            fields.labels = params.labels;
        }

        if (params.components && params.components.length > 0) {
            fields.components = params.components;
        }

        if (params.parent) {
            fields.parent = params.parent;
        }

        // Add custom fields
        if (params.customFields) {
            Object.assign(fields, params.customFields);
        }

        // Make API request
        const response = await client.post<{
            id: string;
            key: string;
            self: string;
        }>("/rest/api/3/issue", {
            fields
        });

        return {
            success: true,
            data: {
                id: response.id,
                key: response.key,
                self: response.self
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create issue",
                retryable: true
            }
        };
    }
}
