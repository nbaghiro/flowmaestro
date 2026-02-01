import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FigmaClient } from "../client/FigmaClient";

export const createCommentOperation: OperationDefinition = {
    id: "createComment",
    name: "Create Comment",
    description: "Add a comment to a Figma file, optionally at a specific location or node",
    category: "comments",
    inputSchema: z.object({
        fileKey: z.string().describe("Figma file key from URL"),
        message: z.string().min(1).describe("Comment message text"),
        x: z.number().optional().describe("X coordinate for comment placement"),
        y: z.number().optional().describe("Y coordinate for comment placement"),
        nodeId: z.string().optional().describe("Node ID to attach comment to"),
        parentId: z.string().optional().describe("Parent comment ID for replies")
    }),
    retryable: false
};

export async function executeCreateComment(
    client: FigmaClient,
    params: z.infer<typeof createCommentOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const commentParams: {
            message: string;
            client_meta?: { x: number; y: number; node_id?: string };
            parent_id?: string;
        } = {
            message: params.message
        };

        // Add client_meta if coordinates are provided
        if (params.x !== undefined && params.y !== undefined) {
            commentParams.client_meta = {
                x: params.x,
                y: params.y
            };
            if (params.nodeId) {
                commentParams.client_meta.node_id = params.nodeId;
            }
        }

        // Add parent_id for replies
        if (params.parentId) {
            commentParams.parent_id = params.parentId;
        }

        const result = await client.createComment(params.fileKey, commentParams);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create comment",
                retryable: false
            }
        };
    }
}
