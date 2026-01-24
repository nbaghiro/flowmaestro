import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { TableauClient } from "../client/TableauClient";
import { TableauPageSizeSchema, TableauPageNumberSchema, TableauFilterSchema } from "./schemas";
import type { TableauDataSourcesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Data Sources operation schema
 */
export const listDataSourcesSchema = z.object({
    page_size: TableauPageSizeSchema,
    page_number: TableauPageNumberSchema,
    filter: TableauFilterSchema
});

export type ListDataSourcesParams = z.infer<typeof listDataSourcesSchema>;

/**
 * List Data Sources operation definition
 */
export const listDataSourcesOperation: OperationDefinition = {
    id: "listDataSources",
    name: "List Data Sources",
    description: "Get all data sources on the site",
    category: "datasources",
    inputSchema: listDataSourcesSchema,
    inputSchemaJSON: toJSONSchema(listDataSourcesSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute list data sources operation
 */
export async function executeListDataSources(
    client: TableauClient,
    params: ListDataSourcesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            pageSize: params.page_size.toString(),
            pageNumber: params.page_number.toString()
        };

        if (params.filter) {
            queryParams.filter = params.filter;
        }

        const response = await client.get<TableauDataSourcesResponse>(
            client.makeSitePath("/datasources"),
            queryParams
        );

        return {
            success: true,
            data: {
                datasources: response.datasources?.datasource || [],
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
                message: error instanceof Error ? error.message : "Failed to list data sources",
                retryable: true
            }
        };
    }
}
