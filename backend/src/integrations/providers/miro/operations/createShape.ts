import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MiroClient } from "../client/MiroClient";

export const createShapeOperation: OperationDefinition = {
    id: "createShape",
    name: "Create Shape",
    description: "Create a shape on a Miro board (rectangle, circle, triangle, etc.)",
    category: "items",
    inputSchema: z.object({
        boardId: z.string().describe("The ID of the board to add the shape to"),
        shape: z
            .string()
            .describe(
                "Shape type (e.g., 'rectangle', 'circle', 'triangle', 'rhombus', 'round_rectangle')"
            ),
        content: z.string().optional().describe("Text content inside the shape"),
        x: z.number().optional().describe("X position on the board"),
        y: z.number().optional().describe("Y position on the board"),
        fillColor: z.string().optional().describe("Fill color (hex color code, e.g., '#ff0000')"),
        borderColor: z
            .string()
            .optional()
            .describe("Border color (hex color code, e.g., '#000000')"),
        borderWidth: z.string().optional().describe("Border width (e.g., '2.0')")
    }),
    retryable: false
};

export async function executeCreateShape(
    client: MiroClient,
    params: z.infer<typeof createShapeOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const shapeParams: {
            data: { content?: string; shape: string };
            position?: { x: number; y: number; origin?: string };
            style?: { fillColor?: string; borderColor?: string; borderWidth?: string };
        } = {
            data: {
                shape: params.shape,
                content: params.content
            }
        };

        if (params.x !== undefined && params.y !== undefined) {
            shapeParams.position = {
                x: params.x,
                y: params.y,
                origin: "center"
            };
        }

        if (params.fillColor || params.borderColor || params.borderWidth) {
            shapeParams.style = {};
            if (params.fillColor) shapeParams.style.fillColor = params.fillColor;
            if (params.borderColor) shapeParams.style.borderColor = params.borderColor;
            if (params.borderWidth) shapeParams.style.borderWidth = params.borderWidth;
        }

        const result = await client.createShape(params.boardId, shapeParams);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create Miro shape",
                retryable: false
            }
        };
    }
}
