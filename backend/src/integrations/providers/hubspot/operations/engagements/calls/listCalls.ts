import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../../core/types";
import type { HubspotClient } from "../../../client/HubspotClient";
import type { HubspotListResponse, HubspotEngagement } from "../../types";

/**
 * List Calls Parameters
 */
export const listCallsSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional(),
    archived: z.boolean().optional()
});

export type ListCallsParams = z.infer<typeof listCallsSchema>;

/**
 * Operation Definition
 */
export const listCallsOperation: OperationDefinition = {
    id: "listCalls",
    name: "List Calls",
    description: "List all call engagements in HubSpot CRM with pagination",
    category: "crm",
    inputSchema: listCallsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute List Calls
 */
export async function executeListCalls(
    client: HubspotClient,
    params: ListCallsParams
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
        if (params.archived !== undefined) {
            queryParams.archived = params.archived;
        }

        const response = await client.get<HubspotListResponse<HubspotEngagement>>(
            "/crm/v3/objects/calls",
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
                message: error instanceof Error ? error.message : "Failed to list calls",
                retryable: false
            }
        };
    }
}
