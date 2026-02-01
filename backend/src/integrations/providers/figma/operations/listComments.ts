import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FigmaClient } from "../client/FigmaClient";

export const listCommentsOperation: OperationDefinition = {
    id: "listComments",
    name: "List Comments",
    description: "Get all comments on a Figma file",
    category: "comments",
    inputSchema: z.object({
        fileKey: z.string().describe("Figma file key from URL")
    }),
    retryable: true
};

export async function executeListComments(
    client: FigmaClient,
    params: z.infer<typeof listCommentsOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.getComments(params.fileKey);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list comments",
                retryable: true
            }
        };
    }
}
