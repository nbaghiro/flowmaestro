import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";

/**
 * Delete Ticket Parameters
 */
export const deleteTicketSchema = z.object({
    ticket_id: z.number().describe("The ID of the ticket to delete")
});

export type DeleteTicketParams = z.infer<typeof deleteTicketSchema>;

/**
 * Operation Definition
 */
export const deleteTicketOperation: OperationDefinition = {
    id: "deleteTicket",
    name: "Delete Ticket",
    description: "Permanently delete a ticket from Zendesk (cannot be undone)",
    category: "tickets",
    inputSchema: deleteTicketSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Ticket
 */
export async function executeDeleteTicket(
    client: ZendeskClient,
    params: DeleteTicketParams
): Promise<OperationResult> {
    try {
        await client.delete(`/tickets/${params.ticket_id}.json`);

        return {
            success: true,
            data: { deleted: true, ticket_id: params.ticket_id }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete ticket",
                retryable: false
            }
        };
    }
}
