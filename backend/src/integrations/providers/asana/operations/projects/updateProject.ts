import { toJSONSchema } from "../../../../core/schema-utils";
import { updateProjectInputSchema, type UpdateProjectInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const updateProjectOperation: OperationDefinition = {
    id: "updateProject",
    name: "Update Project",
    description:
        "Update an existing project in Asana. Can modify name, description, dates, and more.",
    category: "projects",
    inputSchema: updateProjectInputSchema,
    inputSchemaJSON: toJSONSchema(updateProjectInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeUpdateProject(
    client: AsanaClient,
    params: UpdateProjectInput
): Promise<OperationResult> {
    try {
        const { project_gid, ...updateData } = params;

        // Filter out undefined values but keep null (for clearing fields)
        const projectData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined) {
                projectData[key] = value;
            }
        }

        const response = await client.putAsana<{
            gid: string;
            name: string;
            resource_type: string;
            permalink_url: string;
        }>(`/projects/${project_gid}`, projectData);

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
                message: error instanceof Error ? error.message : "Failed to update project",
                retryable: true
            }
        };
    }
}
