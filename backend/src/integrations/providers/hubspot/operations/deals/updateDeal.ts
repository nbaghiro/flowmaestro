import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotDeal } from "../types";

/**
 * Update Deal Parameters
 */
export const updateDealSchema = z.object({
    dealId: z.string(),
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export type UpdateDealParams = z.infer<typeof updateDealSchema>;

/**
 * Operation Definition
 */
export const updateDealOperation: OperationDefinition = {
    id: "updateDeal",
    name: "Update Deal",
    description: "Update a deal's properties by ID",
    category: "crm",
    inputSchema: updateDealSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Deal
 */
export async function executeUpdateDeal(
    client: HubspotClient,
    params: UpdateDealParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/deals/${params.dealId}`;

        const response = await client.patch<HubspotDeal>(endpoint, {
            properties: params.properties
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
                message: error instanceof Error ? error.message : "Failed to update deal",
                retryable: false
            }
        };
    }
}
