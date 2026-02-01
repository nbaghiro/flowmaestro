import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotDeal, HubspotListResponse } from "../types";

/**
 * List Deals Parameters
 */
export const listDealsSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type ListDealsParams = z.infer<typeof listDealsSchema>;

/**
 * Operation Definition
 */
export const listDealsOperation: OperationDefinition = {
    id: "listDeals",
    name: "List Deals",
    description: "List all deals with pagination",
    category: "crm",
    inputSchema: listDealsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute List Deals
 */
export async function executeListDeals(
    client: HubspotClient,
    params: ListDealsParams
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

        const response = await client.get<HubspotListResponse<HubspotDeal>>(
            "/crm/v3/objects/deals",
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
                message: error instanceof Error ? error.message : "Failed to list deals",
                retryable: false
            }
        };
    }
}
