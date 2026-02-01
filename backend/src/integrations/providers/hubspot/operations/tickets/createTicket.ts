import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotTicket } from "../types";

/**
 * Create Ticket Parameters
 */
export const createTicketSchema = z.object({
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    associations: z
        .array(
            z.object({
                to: z.object({
                    id: z.string()
                }),
                types: z.array(
                    z.object({
                        associationCategory: z.string(),
                        associationTypeId: z.number()
                    })
                )
            })
        )
        .optional()
});

export type CreateTicketParams = z.infer<typeof createTicketSchema>;

/**
 * Operation Definition
 */
export const createTicketOperation: OperationDefinition = {
    id: "createTicket",
    name: "Create Ticket",
    description: "Create a new ticket in HubSpot CRM",
    category: "crm",
    inputSchema: createTicketSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Ticket
 */
export async function executeCreateTicket(
    client: HubspotClient,
    params: CreateTicketParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotTicket>("/crm/v3/objects/tickets", {
            properties: params.properties,
            associations: params.associations
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
                message: error instanceof Error ? error.message : "Failed to create ticket",
                retryable: false
            }
        };
    }
}
