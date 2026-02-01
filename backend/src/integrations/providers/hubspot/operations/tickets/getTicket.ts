import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotTicket } from "../types";

/**
 * Get Ticket Parameters
 */
export const getTicketSchema = z.object({
    ticketId: z.string(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type GetTicketParams = z.infer<typeof getTicketSchema>;

/**
 * Operation Definition
 */
export const getTicketOperation: OperationDefinition = {
    id: "getTicket",
    name: "Get Ticket",
    description: "Get a ticket by ID",
    category: "crm",
    inputSchema: getTicketSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Ticket
 */
export async function executeGetTicket(
    client: HubspotClient,
    params: GetTicketParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/tickets/${params.ticketId}`;

        // Build query parameters
        const queryParams: Record<string, unknown> = {};

        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }

        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotTicket>(endpoint, queryParams);

        return {
            success: true,
            data: response
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
