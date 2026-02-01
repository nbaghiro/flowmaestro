import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotObject } from "../types";

/**
 * Create Quote Parameters
 */
export const createQuoteSchema = z.object({
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

export type CreateQuoteParams = z.infer<typeof createQuoteSchema>;

/**
 * Operation Definition
 */
export const createQuoteOperation: OperationDefinition = {
    id: "createQuote",
    name: "Create Quote",
    description: "Create a new quote in HubSpot CRM",
    category: "crm",
    inputSchema: createQuoteSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Quote
 */
export async function executeCreateQuote(
    client: HubspotClient,
    params: CreateQuoteParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotObject>("/crm/v3/objects/quotes", {
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
                message: error instanceof Error ? error.message : "Failed to create quote",
                retryable: false
            }
        };
    }
}
