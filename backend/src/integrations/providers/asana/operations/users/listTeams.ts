import { toJSONSchema } from "../../../../core/schema-utils";
import { listTeamsInputSchema, type ListTeamsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const listTeamsOperation: OperationDefinition = {
    id: "listTeams",
    name: "List Teams",
    description: "List all teams in an organization workspace.",
    category: "users",
    inputSchema: listTeamsInputSchema,
    inputSchemaJSON: toJSONSchema(listTeamsInputSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListTeams(
    client: AsanaClient,
    params: ListTeamsInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const teams = await client.getPaginated<Record<string, unknown>>(
            `/workspaces/${params.workspace}/teams`,
            queryParams,
            params.limit
        );

        return {
            success: true,
            data: {
                teams,
                count: teams.length,
                workspace_gid: params.workspace
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list teams",
                retryable: true
            }
        };
    }
}
