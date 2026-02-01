import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotCompany, HubspotListResponse } from "../types";

/**
 * List Companies Parameters
 */
export const listCompaniesSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional(),
    properties: z.array(z.string()).optional(),
    associations: z.array(z.string()).optional()
});

export type ListCompaniesParams = z.infer<typeof listCompaniesSchema>;

/**
 * Operation Definition
 */
export const listCompaniesOperation: OperationDefinition = {
    id: "listCompanies",
    name: "List Companies",
    description: "List all companies with pagination",
    category: "crm",
    inputSchema: listCompaniesSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute List Companies
 */
export async function executeListCompanies(
    client: HubspotClient,
    params: ListCompaniesParams
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

        const response = await client.get<HubspotListResponse<HubspotCompany>>(
            "/crm/v3/objects/companies",
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
                message: error instanceof Error ? error.message : "Failed to list companies",
                retryable: false
            }
        };
    }
}
