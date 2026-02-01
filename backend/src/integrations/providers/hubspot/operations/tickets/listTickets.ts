import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotTicket, HubspotListResponse } from "../types";

/**
 * List Tickets Parameters
 */
export const listTicketsSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type ListTicketsParams = z.infer<typeof listTicketsSchema>;

/**
 * Operation Definition
 */
export const listTicketsOperation: OperationDefinition = {
    id: "listTickets",
    name: "List Tickets",
    description: "List all tickets with pagination",
    category: "crm",
    inputSchema: listTicketsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute List Tickets
 */
export async function executeListTickets(
    client: HubspotClient,
    params: ListTicketsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.after) {
            queryParams.after = params.after;
        }

        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }

        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotListResponse<HubspotTicket>>(
            "/crm/v3/objects/tickets",
            queryParams
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list tickets",
                retryable: false
            }
        };
    }
}
