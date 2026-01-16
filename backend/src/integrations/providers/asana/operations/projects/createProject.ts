import { toJSONSchema } from "../../../../core/schema-utils";
import { createProjectInputSchema, type CreateProjectInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const createProjectOperation: OperationDefinition = {
    id: "createProject",
    name: "Create Project",
    description: "Create a new project in Asana within a workspace or team.",
    category: "projects",
    inputSchema: createProjectInputSchema,
    inputSchemaJSON: toJSONSchema(createProjectInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeCreateProject(
    client: AsanaClient,
    params: CreateProjectInput
): Promise<OperationResult> {
    try {
        const projectData: Record<string, unknown> = {
            workspace: params.workspace,
            name: params.name
        };

        if (params.notes !== undefined) {
            projectData.notes = params.notes;
        }
        if (params.color !== undefined) {
            projectData.color = params.color;
        }
        if (params.default_view !== undefined) {
            projectData.default_view = params.default_view;
        }
        if (params.due_on !== undefined) {
            projectData.due_on = params.due_on;
        }
        if (params.start_on !== undefined) {
            projectData.start_on = params.start_on;
        }
        if (params.public !== undefined) {
            projectData.public = params.public;
        }
        if (params.team !== undefined) {
            projectData.team = params.team;
        }

        const response = await client.postAsana<{
            gid: string;
            name: string;
            resource_type: string;
            permalink_url: string;
        }>("/projects", projectData);

        return {
            success: true,
            data: {
                gid: response.gid,
                name: response.name,
                resource_type: response.resource_type,
                permalink_url: response.permalink_url
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create project",
                retryable: true
            }
        };
    }
}
