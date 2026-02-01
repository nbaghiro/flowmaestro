import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotTicket, HubspotSearchRequest, HubspotListResponse } from "../types";

/**
 * Search Tickets Parameters
 */
export const searchTicketsSchema = z.object({
    filterGroups: z
        .array(
            z.object({
                filters: z.array(
                    z.object({
                        propertyName: z.string(),
                        operator: z.enum([
                            "EQ",
                            "NEQ",
                            "LT",
                            "LTE",
                            "GT",
                            "GTE",
                            "CONTAINS",
                            "NOT_CONTAINS"
                        ]),
                        value: z.union([z.string(), z.number(), z.boolean()])
                    })
                )
            })
        )
        .optional(),
    sorts: z
        .array(
            z.object({
                propertyName: z.string(),
                direction: z.enum(["ASCENDING", "DESCENDING"])
            })
        )
        .optional(),
    properties: z.array(z.string()).optional(),
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional()
});

export type SearchTicketsParams = z.infer<typeof searchTicketsSchema>;

/**
 * Operation Definition
 */
export const searchTicketsOperation: OperationDefinition = {
    id: "searchTickets",
    name: "Search Tickets",
    description: "Search tickets with filters and sorting",
    category: "crm",
    inputSchema: searchTicketsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Search Tickets
 */
export async function executeSearchTickets(
    client: HubspotClient,
    params: SearchTicketsParams
): Promise<OperationResult> {
    try {
        const searchRequest: HubspotSearchRequest = {
            filterGroups: params.filterGroups,
            sorts: params.sorts,
            properties: params.properties,
            limit: params.limit,
            after: params.after
        };

        const response = await client.post<HubspotListResponse<HubspotTicket>>(
            "/crm/v3/objects/tickets/search",
            searchRequest
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
                message: error instanceof Error ? error.message : "Failed to search tickets",
                retryable: false
            }
        };
    }
}
