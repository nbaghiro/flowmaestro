import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CanvaClient } from "../client/CanvaClient";

export const listFoldersOperation: OperationDefinition = {
    id: "listFolders",
    name: "List Folders",
    description: "List folders in the user's Canva account",
    category: "folders",
    inputSchema: z.object({
        continuation: z.string().optional().describe("Continuation token for pagination")
    }),
    retryable: true
};

export async function executeListFolders(
    client: CanvaClient,
    params: z.infer<typeof listFoldersOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.listFolders({
            continuation: params.continuation
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
                message: error instanceof Error ? error.message : "Failed to list Canva folders",
                retryable: true
            }
        };
    }
}
