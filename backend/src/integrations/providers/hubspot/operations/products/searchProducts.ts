import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotSearchRequest, HubspotProduct } from "../types";

/**
 * Search Products Parameters
 */
export const searchProductsSchema = z.object({
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
    limit: z.number().min(1).max(100).optional(),
    after: z.string().optional()
});

export type SearchProductsParams = z.infer<typeof searchProductsSchema>;

interface SearchProductsResponse {
    total: number;
    results: HubspotProduct[];
    paging?: {
        next?: {
            after: string;
            link: string;
        };
    };
}

/**
 * Operation Definition
 */
export const searchProductsOperation: OperationDefinition = {
    id: "searchProducts",
    name: "Search Products",
    description: "Search products in HubSpot CRM using filters and sorting",
    category: "crm",
    inputSchema: searchProductsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Search Products
 */
export async function executeSearchProducts(
    client: HubspotClient,
    params: SearchProductsParams
): Promise<OperationResult> {
    try {
        const searchRequest: HubspotSearchRequest = {
            filterGroups: params.filterGroups,
            sorts: params.sorts,
            properties: params.properties,
            limit: params.limit,
            after: params.after
        };

        const response = await client.post<SearchProductsResponse>(
            "/crm/v3/objects/products/search",
            searchRequest
        );

        return {
            success: true,
            data: {
                products: response.results,
                total: response.total,
                nextPageToken: response.paging?.next?.after
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search products",
                retryable: false
            }
        };
    }
}
