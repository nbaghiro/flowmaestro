import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotDeal } from "../types";

/**
 * Create Deal Parameters
 */
export const createDealSchema = z.object({
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

export type CreateDealParams = z.infer<typeof createDealSchema>;

/**
 * Operation Definition
 */
export const createDealOperation: OperationDefinition = {
    id: "createDeal",
    name: "Create Deal",
    description: "Create a new deal in HubSpot CRM",
    category: "crm",
    inputSchema: createDealSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Deal
 */
export async function executeCreateDeal(
    client: HubspotClient,
    params: CreateDealParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotDeal>("/crm/v3/objects/deals", {
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
                message: error instanceof Error ? error.message : "Failed to create deal",
                retryable: false
            }
        };
    }
}
