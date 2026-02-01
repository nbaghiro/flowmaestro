import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotEngagement } from "../../types";

/**
 * Get Call Parameters
 */
export const getCallSchema = z.object({
    callId: z.string(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type GetCallParams = z.infer<typeof getCallSchema>;

/**
 * Operation Definition
 */
export const getCallOperation: OperationDefinition = {
    id: "getCall",
    name: "Get Call",
    description: "Retrieve a call engagement by ID from HubSpot CRM",
    category: "crm",
    inputSchema: getCallSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Call
 */
export async function executeGetCall(
    client: HubspotClient,
    params: GetCallParams
): Promise<OperationResult> {
    try {
        const endpoint = `/crm/v3/objects/calls/${params.callId}`;

        const queryParams: Record<string, unknown> = {};
        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }
        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        const response = await client.get<HubspotEngagement>(endpoint, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get call",
                retryable: false
            }
        };
    }
}
