import { toJSONSchema } from "../../../../core/schema-utils";
import { LIST_TEAMS } from "../../graphql/queries";
import { listTeamsInputSchema, type ListTeamsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const listTeamsOperation: OperationDefinition = {
    id: "listTeams",
    name: "List Teams",
    description: "List all teams in the Monday.com account.",
    category: "teams",
    inputSchema: listTeamsInputSchema,
    inputSchemaJSON: toJSONSchema(listTeamsInputSchema),
    retryable: true,
    timeout: 15000
};

interface ListTeamsResponse {
    teams: Array<{
        id: string;
        name: string;
        picture_url: string | null;
        users: Array<{
            id: string;
            name: string;
        }>;
    }>;
}

export async function executeListTeams(
    client: MondayClient,
    _params: ListTeamsInput
): Promise<OperationResult> {
    try {
        const response = await client.query<ListTeamsResponse>(LIST_TEAMS);

        const teams = response.teams || [];

        return {
            success: true,
            data: {
                teams,
                count: teams.length
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
