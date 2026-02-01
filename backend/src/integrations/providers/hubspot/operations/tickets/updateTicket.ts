import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotTicket } from "../types";

/**
 * Update Ticket Parameters
 */
export const updateTicketSchema = z.object({
    ticketId: z.string(),
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export type UpdateTicketParams = z.infer<typeof updateTicketSchema>;

/**
 * Operation Definition
 */
export const updateTicketOperation: OperationDefinition = {
    id: "updateTicket",
    name: "Update Ticket",
    description: "Update a ticket's properties by ID",
    category: "crm",
    inputSchema: updateTicketSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Ticket
 */
export async function executeUpdateTicket(
    client: HubspotClient,
    params: UpdateTicketParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/tickets/${params.ticketId}`;

        const response = await client.patch<HubspotTicket>(endpoint, {
            properties: params.properties
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update ticket",
                retryable: false
            }
        };
    }
}
