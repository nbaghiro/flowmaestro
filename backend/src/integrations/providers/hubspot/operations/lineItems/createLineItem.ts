import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotObject } from "../types";

/**
 * Create Line Item Parameters
 */
export const createLineItemSchema = z.object({
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

export type CreateLineItemParams = z.infer<typeof createLineItemSchema>;

/**
 * Operation Definition
 */
export const createLineItemOperation: OperationDefinition = {
    id: "createLineItem",
    name: "Create Line Item",
    description: "Create a new line item in HubSpot CRM",
    category: "crm",
    inputSchema: createLineItemSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Line Item
 */
export async function executeCreateLineItem(
    client: HubspotClient,
    params: CreateLineItemParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotObject>("/crm/v3/objects/line_items", {
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
                message: error instanceof Error ? error.message : "Failed to create line item",
                retryable: false
            }
        };
    }
}
