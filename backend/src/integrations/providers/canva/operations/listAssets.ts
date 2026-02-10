import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CanvaClient } from "../client/CanvaClient";

export const listAssetsOperation: OperationDefinition = {
    id: "listAssets",
    name: "List Assets",
    description: "List uploaded assets in the user's Canva account",
    category: "assets",
    inputSchema: z.object({
        continuation: z.string().optional().describe("Continuation token for pagination")
    }),
    retryable: true
};

export async function executeListAssets(
    client: CanvaClient,
    params: z.infer<typeof listAssetsOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.listAssets({
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
                message: error instanceof Error ? error.message : "Failed to list Canva assets",
                retryable: true
            }
        };
    }
}
