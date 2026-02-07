import { z } from "zod";
import { RampClient } from "../../client/RampClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { RampCard } from "../types";

/**
 * Get Card operation schema
 */
export const getCardSchema = z.object({
    id: z.string().describe("Card ID")
});

export type GetCardParams = z.infer<typeof getCardSchema>;

/**
 * Get Card operation definition
 */
export const getCardOperation: OperationDefinition = {
    id: "getCard",
    name: "Get Card",
    description: "Get a specific card by ID",
    category: "cards",
    inputSchema: getCardSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get card operation
 */
export async function executeGetCard(
    client: RampClient,
    params: GetCardParams
): Promise<OperationResult> {
    try {
        const card = await client.get<RampCard>(`/cards/${encodeURIComponent(params.id)}`);

        return {
            success: true,
            data: card
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get card";

        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Card not found",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
