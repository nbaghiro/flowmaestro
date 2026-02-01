import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotObject } from "../types";

/**
 * Update Quote Parameters
 */
export const updateQuoteSchema = z.object({
    quoteId: z.string(),
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export type UpdateQuoteParams = z.infer<typeof updateQuoteSchema>;

/**
 * Operation Definition
 */
export const updateQuoteOperation: OperationDefinition = {
    id: "updateQuote",
    name: "Update Quote",
    description: "Update an existing quote in HubSpot CRM",
    category: "crm",
    inputSchema: updateQuoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Quote
 */
export async function executeUpdateQuote(
    client: HubspotClient,
    params: UpdateQuoteParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<HubspotObject>(
            `/crm/v3/objects/quotes/${params.quoteId}`,
            { properties: params.properties }
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
                message: error instanceof Error ? error.message : "Failed to update quote",
                retryable: false
            }
        };
    }
}
