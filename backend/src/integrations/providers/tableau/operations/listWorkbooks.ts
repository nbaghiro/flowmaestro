import { z } from "zod";
import { TableauClient } from "../client/TableauClient";
import { TableauPageSizeSchema, TableauPageNumberSchema, TableauFilterSchema } from "./schemas";
import type { TableauWorkbooksResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Workbooks operation schema
 */
export const listWorkbooksSchema = z.object({
    page_size: TableauPageSizeSchema,
    page_number: TableauPageNumberSchema,
    filter: TableauFilterSchema
});

export type ListWorkbooksParams = z.infer<typeof listWorkbooksSchema>;

/**
 * List Workbooks operation definition
 */
export const listWorkbooksOperation: OperationDefinition = {
    id: "listWorkbooks",
    name: "List Workbooks",
    description: "Get all workbooks on the site",
    category: "workbooks",
    inputSchema: listWorkbooksSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list workbooks operation
 */
export async function executeListWorkbooks(
    client: TableauClient,
    params: ListWorkbooksParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            pageSize: params.page_size.toString(),
            pageNumber: params.page_number.toString()
        };

        if (params.filter) {
            queryParams.filter = params.filter;
        }

        const response = await client.get<TableauWorkbooksResponse>(
            client.makeSitePath("/workbooks"),
            queryParams
        );

        return {
            success: true,
            data: {
                workbooks: response.workbooks?.workbook || [],
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
                message: error instanceof Error ? error.message : "Failed to list workbooks",
                retryable: true
            }
        };
    }
}
