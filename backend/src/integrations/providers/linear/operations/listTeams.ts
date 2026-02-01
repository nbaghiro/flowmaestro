import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { LinearClient } from "../client/LinearClient";

/**
 * List teams input schema (no parameters needed)
 */
export const listTeamsSchema = z.object({});

export type ListTeamsParams = z.infer<typeof listTeamsSchema>;

/**
 * List teams operation definition
 */
export const listTeamsOperation: OperationDefinition = {
    id: "listTeams",
    name: "List Teams",
    description: "List all teams in Linear workspace",
    category: "teams",
    retryable: true,
    inputSchema: listTeamsSchema
};

/**
 * Execute list teams operation
 */
export async function executeListTeams(
    client: LinearClient,
    _params: ListTeamsParams
): Promise<OperationResult> {
    try {
        const response = await client.listTeams();

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list Linear teams",
                retryable: true
            }
        };
    }
}
