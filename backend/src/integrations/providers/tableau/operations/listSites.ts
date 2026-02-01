import { z } from "zod";
import { TableauClient } from "../client/TableauClient";
import { TableauPageSizeSchema, TableauPageNumberSchema } from "./schemas";
import type { TableauSitesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Sites operation schema
 */
export const listSitesSchema = z.object({
    page_size: TableauPageSizeSchema,
    page_number: TableauPageNumberSchema
});

export type ListSitesParams = z.infer<typeof listSitesSchema>;

/**
 * List Sites operation definition
 */
export const listSitesOperation: OperationDefinition = {
    id: "listSites",
    name: "List Sites",
    description: "Get all sites the user has access to",
    category: "sites",
    inputSchema: listSitesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list sites operation
 */
export async function executeListSites(
    client: TableauClient,
    params: ListSitesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            pageSize: params.page_size.toString(),
            pageNumber: params.page_number.toString()
        };

        const response = await client.get<TableauSitesResponse>("/sites", queryParams);

        return {
            success: true,
            data: {
                sites: response.sites?.site || [],
                pagination: {
                    page_number: parseInt(response.pagination.pageNumber),
                    page_size: parseInt(response.pagination.pageSize),
                    total_available: parseInt(response.pagination.totalAvailable)
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list sites",
                retryable: true
            }
        };
    }
}
