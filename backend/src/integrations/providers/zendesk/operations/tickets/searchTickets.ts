import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { ZendeskSearchResult, ZendeskTicket } from "../../types";

/**
 * Search Tickets Parameters
 */
export const searchTicketsSchema = z.object({
    query: z
        .string()
        .describe(
            "Zendesk search query (e.g., 'status:open priority:high', 'subject:refund', 'assignee:me')"
        ),
    sort_by: z
        .enum(["created_at", "updated_at", "priority", "status", "ticket_type"])
        .optional()
        .describe("Field to sort by"),
    sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order (default: desc)"),
    page: z.number().optional().describe("Page number"),
    per_page: z.number().min(1).max(100).optional().describe("Results per page (max: 100)")
});

export type SearchTicketsParams = z.infer<typeof searchTicketsSchema>;

/**
 * Operation Definition
 */
export const searchTicketsOperation: OperationDefinition = {
    id: "searchTickets",
    name: "Search Tickets",
    description:
        "Search for tickets using Zendesk search syntax (e.g., status:open, priority:high, assignee:me)",
    category: "tickets",
    inputSchema: searchTicketsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Search Tickets
 */
export async function executeSearchTickets(
    client: ZendeskClient,
    params: SearchTicketsParams
): Promise<OperationResult> {
    try {
        // Build search query with type:ticket prefix
        const searchQuery = `type:ticket ${params.query}`;

        const queryParams: Record<string, unknown> = {
            query: searchQuery
        };

        if (params.sort_by) queryParams.sort_by = params.sort_by;
        if (params.sort_order) queryParams.sort_order = params.sort_order;
        if (params.page) queryParams.page = params.page;
        if (params.per_page) queryParams.per_page = params.per_page;

        const response = await client.get<ZendeskSearchResult<ZendeskTicket>>(
            "/search.json",
            queryParams
        );

        return {
            success: true,
            data: {
                tickets: response.results,
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
                message: error instanceof Error ? error.message : "Failed to search tickets",
                retryable: true
            }
        };
    }
}
