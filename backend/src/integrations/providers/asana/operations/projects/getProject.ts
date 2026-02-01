import { getProjectInputSchema, type GetProjectInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const getProjectOperation: OperationDefinition = {
    id: "getProject",
    name: "Get Project",
    description: "Retrieve a specific project from Asana by its GID.",
    category: "projects",
    inputSchema: getProjectInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetProject(
    client: AsanaClient,
    params: GetProjectInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const response = await client.getAsana<Record<string, unknown>>(
            `/projects/${params.project_gid}`,
            queryParams
        );

        return {
            success: true,
            data: response
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
