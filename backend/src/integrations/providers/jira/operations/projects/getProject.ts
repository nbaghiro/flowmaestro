import { getProjectInputSchema, type GetProjectInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const getProjectOperation: OperationDefinition = {
    id: "getProject",
    name: "Get Project",
    description: "Get full details of a project, including issue types, components, and versions.",
    category: "projects",
    inputSchema: getProjectInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetProject(
    client: JiraClient,
    params: GetProjectInput
): Promise<OperationResult> {
    try {
        // Build query parameters
        const queryParams: Record<string, unknown> = {};

        if (params.expand && params.expand.length > 0) {
            queryParams.expand = params.expand.join(",");
        }

        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties.join(",");
        }

        // Make API request
        const project = await client.get<unknown>(
            `/rest/api/3/project/${params.projectIdOrKey}`,
            queryParams
        );

        return {
            success: true,
            data: project
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get project",
                retryable: true
            }
        };
    }
}
