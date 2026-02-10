import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MiroClient } from "../client/MiroClient";

export const createTagOperation: OperationDefinition = {
    id: "createTag",
    name: "Create Tag",
    description: "Create a tag on a Miro board for organizing items",
    category: "tags",
    inputSchema: z.object({
        boardId: z.string().describe("The ID of the board to create the tag on"),
        title: z.string().min(1).describe("Title for the tag"),
        fillColor: z
            .string()
            .optional()
            .describe("Fill color for the tag (e.g., 'red', 'light_green', 'cyan', 'yellow')")
    }),
    retryable: false
};

export async function executeCreateTag(
    client: MiroClient,
    params: z.infer<typeof createTagOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.createTag(params.boardId, {
            title: params.title,
            fillColor: params.fillColor
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
                message: error instanceof Error ? error.message : "Failed to create Miro tag",
                retryable: false
            }
        };
    }
}
