import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { TableauClient } from "../client/TableauClient";
import { TableauPageSizeSchema, TableauPageNumberSchema, TableauFilterSchema } from "./schemas";
import type { TableauViewsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Views operation schema
 */
export const listViewsSchema = z.object({
    page_size: TableauPageSizeSchema,
    page_number: TableauPageNumberSchema,
    filter: TableauFilterSchema
});

export type ListViewsParams = z.infer<typeof listViewsSchema>;

/**
 * List Views operation definition
 */
export const listViewsOperation: OperationDefinition = {
    id: "listViews",
    name: "List Views",
    description: "Get all views (visualizations) on the site",
    category: "views",
    inputSchema: listViewsSchema,
    inputSchemaJSON: toJSONSchema(listViewsSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute list views operation
 */
export async function executeListViews(
    client: TableauClient,
    params: ListViewsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            pageSize: params.page_size.toString(),
            pageNumber: params.page_number.toString()
        };

        if (params.filter) {
            queryParams.filter = params.filter;
        }

        const response = await client.get<TableauViewsResponse>(
            client.makeSitePath("/views"),
            queryParams
        );

        return {
            success: true,
            data: {
                views: response.views?.view || [],
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
                message: error instanceof Error ? error.message : "Failed to list views",
                retryable: true
            }
        };
    }
}
