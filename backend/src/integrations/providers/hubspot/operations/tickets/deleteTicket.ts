import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";

/**
 * Delete Ticket Parameters
 */
export const deleteTicketSchema = z.object({
    ticketId: z.string()
});

export type DeleteTicketParams = z.infer<typeof deleteTicketSchema>;

/**
 * Operation Definition
 */
export const deleteTicketOperation: OperationDefinition = {
    id: "deleteTicket",
    name: "Delete Ticket",
    description: "Delete a ticket by ID (archives the ticket)",
    category: "crm",
    inputSchema: deleteTicketSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Ticket
 */
export async function executeDeleteTicket(
    client: HubspotClient,
    params: DeleteTicketParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/tickets/${params.ticketId}`);

        return {
            success: true,
            data: {
                deleted: true,
                ticketId: params.ticketId
            }
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
