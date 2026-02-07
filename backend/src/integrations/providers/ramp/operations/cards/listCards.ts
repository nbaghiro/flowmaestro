import { z } from "zod";
import { RampClient } from "../../client/RampClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { RampCard, RampListResponse } from "../types";

/**
 * List Cards operation schema
 */
export const listCardsSchema = z.object({
    start: z.string().optional().describe("Start cursor for pagination"),
    page_size: z.number().min(1).max(100).optional().default(25),
    cardholder_id: z.string().optional().describe("Filter by cardholder ID"),
    state: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]).optional()
});

export type ListCardsParams = z.infer<typeof listCardsSchema>;

/**
 * List Cards operation definition
 */
export const listCardsOperation: OperationDefinition = {
    id: "listCards",
    name: "List Cards",
    description: "List all corporate cards with pagination and filters",
    category: "cards",
    inputSchema: listCardsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list cards operation
 */
export async function executeListCards(
    client: RampClient,
    params: ListCardsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            page_size: String(params.page_size)
        };

        if (params.start) queryParams.start = params.start;
        if (params.cardholder_id) queryParams.cardholder_id = params.cardholder_id;
        if (params.state) queryParams.state = params.state;

        const queryString = new URLSearchParams(queryParams).toString();
        const response = await client.get<RampListResponse<RampCard>>(`/cards?${queryString}`);

        return {
            success: true,
            data: {
                cards: response.data,
                count: response.data.length,
                next_cursor: response.page?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list cards",
                retryable: true
            }
        };
    }
}
