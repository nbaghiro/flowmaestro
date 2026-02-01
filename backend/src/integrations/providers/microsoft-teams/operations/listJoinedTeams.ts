import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const listJoinedTeamsSchema = z.object({});

export type ListJoinedTeamsParams = z.infer<typeof listJoinedTeamsSchema>;

export const listJoinedTeamsOperation: OperationDefinition = {
    id: "listJoinedTeams",
    name: "List Joined Teams",
    description: "List all Microsoft Teams the user is a member of",
    category: "teams",
    inputSchema: listJoinedTeamsSchema,
    retryable: true
};

export async function executeListJoinedTeams(
    client: MicrosoftTeamsClient,
    _params: ListJoinedTeamsParams
): Promise<OperationResult> {
    try {
        const result = await client.listJoinedTeams();
        return {
            success: true,
            data: {
                teams: result.value,
                hasMore: !!result["@odata.nextLink"]
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
