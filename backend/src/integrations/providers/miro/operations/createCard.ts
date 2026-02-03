import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MiroClient } from "../client/MiroClient";

export const createCardOperation: OperationDefinition = {
    id: "createCard",
    name: "Create Card",
    description: "Create a card on a Miro board with a title and optional description",
    category: "items",
    inputSchema: z.object({
        boardId: z.string().describe("The ID of the board to add the card to"),
        title: z.string().min(1).describe("Title for the card"),
        description: z.string().optional().describe("Description text for the card"),
        x: z.number().optional().describe("X position on the board"),
        y: z.number().optional().describe("Y position on the board"),
        cardTheme: z
            .string()
            .optional()
            .describe("Card theme color (hex color code, e.g., '#2d9bf0')")
    }),
    retryable: false
};

export async function executeCreateCard(
    client: MiroClient,
    params: z.infer<typeof createCardOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const cardParams: {
            data: { title: string; description?: string };
            position?: { x: number; y: number; origin?: string };
            style?: { cardTheme?: string };
        } = {
            data: {
                title: params.title,
                description: params.description
            }
        };

        if (params.x !== undefined && params.y !== undefined) {
            cardParams.position = {
                x: params.x,
                y: params.y,
                origin: "center"
            };
        }

        if (params.cardTheme) {
            cardParams.style = { cardTheme: params.cardTheme };
        }

        const result = await client.createCard(params.boardId, cardParams);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create Miro card",
                retryable: false
            }
        };
    }
}
