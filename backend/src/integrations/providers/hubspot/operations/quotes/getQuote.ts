import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotObject } from "../types";

/**
 * Get Quote Parameters
 */
export const getQuoteSchema = z.object({
    quoteId: z.string(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type GetQuoteParams = z.infer<typeof getQuoteSchema>;

/**
 * Operation Definition
 */
export const getQuoteOperation: OperationDefinition = {
    id: "getQuote",
    name: "Get Quote",
    description: "Retrieve a quote by ID from HubSpot CRM",
    category: "crm",
    inputSchema: getQuoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Quote
 */
export async function executeGetQuote(
    client: HubspotClient,
    params: GetQuoteParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/quotes/${params.quoteId}`;

        const queryParams: Record<string, unknown> = {};
        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }
        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotObject>(endpoint, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get quote",
                retryable: false
            }
        };
    }
}
