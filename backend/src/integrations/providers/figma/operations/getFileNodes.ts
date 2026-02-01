import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FigmaClient } from "../client/FigmaClient";

export const getFileNodesOperation: OperationDefinition = {
    id: "getFileNodes",
    name: "Get File Nodes",
    description: "Retrieve specific nodes from a Figma file by their IDs",
    category: "files",
    inputSchema: z.object({
        fileKey: z.string().describe("Figma file key from URL"),
        nodeIds: z.array(z.string()).min(1).describe("Node IDs to retrieve (e.g., ['1:2', '1:3'])"),
        version: z.string().optional().describe("Specific version ID to retrieve"),
        depth: z
            .number()
            .min(1)
            .optional()
            .describe("Tree depth to retrieve (limits nesting levels)"),
        includeGeometry: z.boolean().optional().describe("Include vector path geometry data")
    }),
    retryable: true
};

export async function executeGetFileNodes(
    client: FigmaClient,
    params: z.infer<typeof getFileNodesOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.getFileNodes(params.fileKey, params.nodeIds, {
            version: params.version,
            depth: params.depth,
            geometry: params.includeGeometry ? "paths" : undefined
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
                message: error instanceof Error ? error.message : "Failed to get file nodes",
                retryable: true
            }
        };
    }
}
