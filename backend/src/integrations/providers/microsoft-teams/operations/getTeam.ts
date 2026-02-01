import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const getTeamSchema = z.object({
    teamId: z.string().describe("ID of the team")
});

export type GetTeamParams = z.infer<typeof getTeamSchema>;

export const getTeamOperation: OperationDefinition = {
    id: "getTeam",
    name: "Get Team",
    description: "Get details of a specific Microsoft Team",
    category: "teams",
    inputSchema: getTeamSchema,
    retryable: true
};

export async function executeGetTeam(
    client: MicrosoftTeamsClient,
    params: GetTeamParams
): Promise<OperationResult> {
    try {
        const result = await client.getTeam(params.teamId);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get team",
                retryable: true
            }
        };
    }
}
