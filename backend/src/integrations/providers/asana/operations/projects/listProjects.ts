import { listProjectsInputSchema, type ListProjectsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const listProjectsOperation: OperationDefinition = {
    id: "listProjects",
    name: "List Projects",
    description: "List projects from a workspace or team in Asana.",
    category: "projects",
    inputSchema: listProjectsInputSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListProjects(
    client: AsanaClient,
    params: ListProjectsInput
): Promise<OperationResult> {
    try {
        // Determine the endpoint based on provided filters
        let url: string;
        const queryParams: Record<string, unknown> = {};

        if (params.workspace) {
            url = `/workspaces/${params.workspace}/projects`;
        } else if (params.team) {
            url = `/teams/${params.team}/projects`;
        } else {
            // Default to listing all projects the user has access to
            url = "/projects";
        }

        if (params.archived !== undefined) {
            queryParams.archived = params.archived;
        }
        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const projects = await client.getPaginated<Record<string, unknown>>(
            url,
            queryParams,
            params.limit
        );

        return {
            success: true,
            data: {
                projects,
                count: projects.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list projects",
                retryable: true
            }
        };
    }
}
