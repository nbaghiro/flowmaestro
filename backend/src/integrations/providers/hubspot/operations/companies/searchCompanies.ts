import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotCompany, HubspotSearchRequest, HubspotListResponse } from "../types";

/**
 * Search Companies Parameters
 */
export const searchCompaniesSchema = z.object({
    filterGroups: z
        .array(
            z.object({
                filters: z.array(
                    z.object({
                        propertyName: z.string(),
                        operator: z.enum([
                            "EQ",
                            "NEQ",
                            "LT",
                            "LTE",
                            "GT",
                            "GTE",
                            "CONTAINS",
                            "NOT_CONTAINS"
                        ]),
                        value: z.union([z.string(), z.number(), z.boolean()])
                    })
                )
            })
        )
        .optional(),
    sorts: z
        .array(
            z.object({
                propertyName: z.string(),
                direction: z.enum(["ASCENDING", "DESCENDING"])
            })
        )
        .optional(),
    properties: z.array(z.string()).optional(),
    limit: z.number().min(1).max(100).optional().default(10),
    after: z.string().optional()
});

export type SearchCompaniesParams = z.infer<typeof searchCompaniesSchema>;

/**
 * Operation Definition
 */
export const searchCompaniesOperation: OperationDefinition = {
    id: "searchCompanies",
    name: "Search Companies",
    description: "Search companies with filters and sorting",
    category: "crm",
    inputSchema: searchCompaniesSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Search Companies
 */
export async function executeSearchCompanies(
    client: HubspotClient,
    params: SearchCompaniesParams
): Promise<OperationResult> {
    try {
        const searchRequest: HubspotSearchRequest = {
            filterGroups: params.filterGroups,
            sorts: params.sorts,
            properties: params.properties,
            limit: params.limit,
            after: params.after
        };

        const response = await client.post<HubspotListResponse<HubspotCompany>>(
            "/crm/v3/objects/companies/search",
            searchRequest
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
                message: error instanceof Error ? error.message : "Failed to search companies",
                retryable: false
            }
        };
    }
}
