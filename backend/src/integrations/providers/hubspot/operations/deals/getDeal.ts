import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotDeal } from "../types";

/**
 * Get Deal Parameters
 */
export const getDealSchema = z.object({
    dealId: z.string(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type GetDealParams = z.infer<typeof getDealSchema>;

/**
 * Operation Definition
 */
export const getDealOperation: OperationDefinition = {
    id: "getDeal",
    name: "Get Deal",
    description: "Get a deal by ID",
    category: "crm",
    inputSchema: getDealSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Deal
 */
export async function executeGetDeal(
    client: HubspotClient,
    params: GetDealParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/deals/${params.dealId}`;

        // Build query parameters
        const queryParams: Record<string, unknown> = {};

        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }

        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotDeal>(endpoint, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get deal",
                retryable: false
            }
        };
    }
}
