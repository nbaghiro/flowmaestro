import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { TicketsResponse } from "../../types";

/**
 * List Tickets Parameters
 */
export const listTicketsSchema = z.object({
    page: z.number().optional().describe("Page number (default: 1)"),
    per_page: z.number().min(1).max(100).optional().describe("Results per page (max: 100)"),
    sort_by: z
        .enum(["created_at", "updated_at", "priority", "status", "ticket_type"])
        .optional()
        .describe("Field to sort by"),
    sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order (default: asc)")
});

export type ListTicketsParams = z.infer<typeof listTicketsSchema>;

/**
 * Operation Definition
 */
export const listTicketsOperation: OperationDefinition = {
    id: "listTickets",
    name: "List Tickets",
    description: "List all tickets in Zendesk with pagination",
    category: "tickets",
    inputSchema: listTicketsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute List Tickets
 */
export async function executeListTickets(
    client: ZendeskClient,
    params: ListTicketsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.page) queryParams.page = params.page;
        if (params.per_page) queryParams.per_page = params.per_page;
        if (params.sort_by) queryParams.sort_by = params.sort_by;
        if (params.sort_order) queryParams.sort_order = params.sort_order;

        const response = await client.get<TicketsResponse>("/tickets.json", queryParams);

        return {
            success: true,
            data: {
                tickets: response.tickets,
                count: response.count,
                next_page: response.next_page,
                previous_page: response.previous_page
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tickets",
                retryable: true
            }
        };
    }
}
