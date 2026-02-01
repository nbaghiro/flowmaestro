import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Update Call Parameters
 */
export const updateCallSchema = z.object({
    callId: z.string(),
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export type UpdateCallParams = z.infer<typeof updateCallSchema>;

/**
 * Operation Definition
 */
export const updateCallOperation: OperationDefinition = {
    id: "updateCall",
    name: "Update Call",
    description: "Update an existing call engagement in HubSpot CRM",
    category: "crm",
    inputSchema: updateCallSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Call
 */
export async function executeUpdateCall(
    client: HubspotClient,
    params: UpdateCallParams
): Promise<OperationResult> {
    try {
        const response = await client.patch<HubspotEngagement>(
            `/crm/v3/objects/calls/${params.callId}`,
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
                message: error instanceof Error ? error.message : "Failed to update call",
                retryable: false
            }
        };
    }
}
