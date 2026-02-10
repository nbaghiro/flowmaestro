import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MiroClient } from "../client/MiroClient";

export const createBoardOperation: OperationDefinition = {
    id: "createBoard",
    name: "Create Board",
    description: "Create a new Miro board with a name and optional description",
    category: "boards",
    inputSchema: z.object({
        name: z.string().min(1).describe("Name for the new board"),
        description: z.string().optional().describe("Description for the board"),
        teamId: z.string().optional().describe("Team ID to create the board in")
    }),
    retryable: false
};

export async function executeCreateBoard(
    client: MiroClient,
    params: z.infer<typeof createBoardOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.createBoard({
            name: params.name,
            description: params.description,
            team_id: params.teamId
        });

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create Miro board",
                retryable: false
            }
        };
    }
}
