import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CanvaClient } from "../client/CanvaClient";

export const listDesignsOperation: OperationDefinition = {
    id: "listDesigns",
    name: "List Designs",
    description: "List designs in the user's Canva account with optional search query",
    category: "designs",
    inputSchema: z.object({
        query: z.string().optional().describe("Search query to filter designs"),
        continuation: z.string().optional().describe("Continuation token for pagination"),
        ownership: z
            .enum(["owned", "shared", "any"])
            .optional()
            .describe("Filter by ownership type")
    }),
    retryable: true
};

export async function executeListDesigns(
    client: CanvaClient,
    params: z.infer<typeof listDesignsOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.listDesigns({
            query: params.query,
            continuation: params.continuation,
            ownership: params.ownership
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
                message: error instanceof Error ? error.message : "Failed to list Canva designs",
                retryable: true
            }
        };
    }
}
