import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotCompany } from "../types";

/**
 * Update Company Parameters
 */
export const updateCompanySchema = z
    .object({
        companyId: z.string().optional(),
        domain: z.string().optional(),
        properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    })
    .refine((data) => data.companyId || data.domain, {
        message: "Either companyId or domain must be provided"
    });

export type UpdateCompanyParams = z.infer<typeof updateCompanySchema>;

/**
 * Operation Definition
 */
export const updateCompanyOperation: OperationDefinition = {
    id: "updateCompany",
    name: "Update Company",
    description: "Update a company's properties by ID or domain",
    category: "crm",
    inputSchema: updateCompanySchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Company
 */
export async function executeUpdateCompany(
    client: HubspotClient,
    params: UpdateCompanyParams
): Promise<OperationResult> {
    try {
        let endpoint = "/crm/v3/objects/companies";

        const queryParams: Record<string, unknown> = {};

        if (params.domain) {
            endpoint += `/${encodeURIComponent(params.domain)}`;
            queryParams.idProperty = "domain";
        } else if (params.companyId) {
            endpoint += `/${params.companyId}`;
        }

        const response = await client.patch<HubspotCompany>(endpoint, {
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
                message: error instanceof Error ? error.message : "Failed to update company",
                retryable: false
            }
        };
    }
}
