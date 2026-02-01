import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { TicketResponse } from "../../types";

/**
 * Get Ticket Parameters
 */
export const getTicketSchema = z.object({
    ticket_id: z.number().describe("The ID of the ticket to retrieve")
});

export type GetTicketParams = z.infer<typeof getTicketSchema>;

/**
 * Operation Definition
 */
export const getTicketOperation: OperationDefinition = {
    id: "getTicket",
    name: "Get Ticket",
    description: "Get a ticket by ID from Zendesk",
    category: "tickets",
    inputSchema: getTicketSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Ticket
 */
export async function executeGetTicket(
    client: ZendeskClient,
    params: GetTicketParams
): Promise<OperationResult> {
    try {
        const response = await client.get<TicketResponse>(`/tickets/${params.ticket_id}.json`);

        return {
            success: true,
            data: response.ticket
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get ticket",
                retryable: false
            }
        };
    }
}
