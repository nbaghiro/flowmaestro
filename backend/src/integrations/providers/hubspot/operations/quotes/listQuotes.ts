import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotListResponse, HubspotObject } from "../types";

/**
 * List Quotes Parameters
 */
export const listQuotesSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional(),
    archived: z.boolean().optional()
});

export type ListQuotesParams = z.infer<typeof listQuotesSchema>;

/**
 * Operation Definition
 */
export const listQuotesOperation: OperationDefinition = {
    id: "listQuotes",
    name: "List Quotes",
    description: "List all quotes in HubSpot CRM with pagination",
    category: "crm",
    inputSchema: listQuotesSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute List Quotes
 */
export async function executeListQuotes(
    client: HubspotClient,
    params: ListQuotesParams
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
        if (params.archived !== undefined) {
            queryParams.archived = params.archived;
        }

        const response = await client.get<HubspotListResponse<HubspotObject>>(
            "/crm/v3/objects/quotes",
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
                message: error instanceof Error ? error.message : "Failed to list quotes",
                retryable: false
            }
        };
    }
}
