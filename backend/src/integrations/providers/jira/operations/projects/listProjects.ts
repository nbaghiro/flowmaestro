import { toJSONSchema } from "../../../../core/schema-utils";
import { listProjectsInputSchema, type ListProjectsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { JiraClient } from "../../client/JiraClient";

export const listProjectsOperation: OperationDefinition = {
    id: "listProjects",
    name: "List Projects",
    description: "Get a list of all projects accessible to the user.",
    category: "projects",
    inputSchema: listProjectsInputSchema,
    inputSchemaJSON: toJSONSchema(listProjectsInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeListProjects(
    client: JiraClient,
    params: ListProjectsInput
): Promise<OperationResult> {
    try {
        // Build query parameters
        const queryParams: Record<string, unknown> = {};

        if (params.expand && params.expand.length > 0) {
            queryParams.expand = params.expand.join(",");
        }

        if (params.recent !== undefined) {
            queryParams.recent = params.recent;
        }

        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties.join(",");
        }

        // Make API request
        const projects = await client.get<unknown[]>("/rest/api/3/project/search", queryParams);

        return {
            success: true,
            data: {
                projects
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
