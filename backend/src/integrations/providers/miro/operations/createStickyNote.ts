import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MiroClient } from "../client/MiroClient";

export const createStickyNoteOperation: OperationDefinition = {
    id: "createStickyNote",
    name: "Create Sticky Note",
    description: "Create a sticky note on a Miro board with content and optional positioning",
    category: "items",
    inputSchema: z.object({
        boardId: z.string().describe("The ID of the board to add the sticky note to"),
        content: z.string().min(1).describe("Text content for the sticky note"),
        x: z.number().optional().describe("X position on the board"),
        y: z.number().optional().describe("Y position on the board"),
        fillColor: z
            .string()
            .optional()
            .describe("Fill color for the sticky note (e.g., 'light_yellow', 'light_green')"),
        textAlign: z
            .enum(["left", "center", "right"])
            .optional()
            .describe("Text alignment within the sticky note")
    }),
    retryable: false
};

export async function executeCreateStickyNote(
    client: MiroClient,
    params: z.infer<typeof createStickyNoteOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const stickyParams: {
            data: { content: string };
            position?: { x: number; y: number; origin?: string };
            style?: { fillColor?: string; textAlign?: string; textAlignVertical?: string };
        } = {
            data: { content: params.content }
        };

        if (params.x !== undefined && params.y !== undefined) {
            stickyParams.position = {
                x: params.x,
                y: params.y,
                origin: "center"
            };
        }

        if (params.fillColor || params.textAlign) {
            stickyParams.style = {};
            if (params.fillColor) stickyParams.style.fillColor = params.fillColor;
            if (params.textAlign) stickyParams.style.textAlign = params.textAlign;
        }

        const result = await client.createStickyNote(params.boardId, stickyParams);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to create Miro sticky note",
                retryable: false
            }
        };
    }
}
