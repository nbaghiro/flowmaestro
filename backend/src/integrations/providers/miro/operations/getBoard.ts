import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MiroClient } from "../client/MiroClient";

export const getBoardOperation: OperationDefinition = {
    id: "getBoard",
    name: "Get Board",
    description: "Retrieve details of a specific Miro board by its ID",
    category: "boards",
    inputSchema: z.object({
        boardId: z.string().describe("The ID of the Miro board to retrieve")
    }),
    retryable: true
};

export async function executeGetBoard(
    client: MiroClient,
    params: z.infer<typeof getBoardOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.getBoard(params.boardId);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get Miro board",
                retryable: true
            }
        };
    }
}
