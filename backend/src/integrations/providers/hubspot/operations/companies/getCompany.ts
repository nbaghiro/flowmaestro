import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotCompany } from "../types";

/**
 * Get Company Parameters
 */
export const getCompanySchema = z
    .object({
        companyId: z.string().optional(),
        domain: z.string().optional(),
        properties: z.array(z.string()).optional(),
        associations: z.array(z.string()).optional()
    })
    .refine((data) => data.companyId || data.domain, {
        message: "Either companyId or domain must be provided"
    });

export type GetCompanyParams = z.infer<typeof getCompanySchema>;

/**
 * Operation Definition
 */
export const getCompanyOperation: OperationDefinition = {
    id: "getCompany",
    name: "Get Company",
    description: "Get a company by ID or domain",
    category: "crm",
    inputSchema: getCompanySchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Company
 */
export async function executeGetCompany(
    client: HubspotClient,
    params: GetCompanyParams
): Promise<OperationResult> {
    try {
        let endpoint = "/crm/v3/objects/companies";

        // Build query parameters
        const queryParams: Record<string, unknown> = {};

        if (params.properties && params.properties.length > 0) {
            queryParams.properties = params.properties;
        }

        if (params.associations && params.associations.length > 0) {
            queryParams.associations = params.associations;
        }

        // Fetch by domain or ID
        if (params.domain) {
            endpoint += `/${encodeURIComponent(params.domain)}`;
            queryParams.idProperty = "domain";
        } else if (params.companyId) {
            endpoint += `/${params.companyId}`;
        }

        const response = await client.get<HubspotCompany>(endpoint, queryParams);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get company",
                retryable: false
            }
        };
    }
}
