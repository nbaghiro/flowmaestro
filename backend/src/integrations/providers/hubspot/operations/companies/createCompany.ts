import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotCompany } from "../types";

/**
 * Create Company Parameters
 */
export const createCompanySchema = z.object({
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

export type CreateCompanyParams = z.infer<typeof createCompanySchema>;

/**
 * Operation Definition
 */
export const createCompanyOperation: OperationDefinition = {
    id: "createCompany",
    name: "Create Company",
    description: "Create a new company in HubSpot CRM",
    category: "crm",
    inputSchema: createCompanySchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Company
 */
export async function executeCreateCompany(
    client: HubspotClient,
    params: CreateCompanyParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotCompany>("/crm/v3/objects/companies", {
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
                message: error instanceof Error ? error.message : "Failed to create company",
                retryable: false
            }
        };
    }
}
