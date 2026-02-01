import { z } from "zod";
import { TableauClient } from "../client/TableauClient";
import { TableauPageSizeSchema, TableauPageNumberSchema, TableauFilterSchema } from "./schemas";
import type { TableauProjectsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Projects operation schema
 */
export const listProjectsSchema = z.object({
    page_size: TableauPageSizeSchema,
    page_number: TableauPageNumberSchema,
    filter: TableauFilterSchema
});

export type ListProjectsParams = z.infer<typeof listProjectsSchema>;

/**
 * List Projects operation definition
 */
export const listProjectsOperation: OperationDefinition = {
    id: "listProjects",
    name: "List Projects",
    description: "Get all projects on the site",
    category: "projects",
    inputSchema: listProjectsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list projects operation
 */
export async function executeListProjects(
    client: TableauClient,
    params: ListProjectsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            pageSize: params.page_size.toString(),
            pageNumber: params.page_number.toString()
        };

        if (params.filter) {
            queryParams.filter = params.filter;
        }

        const response = await client.get<TableauProjectsResponse>(
            client.makeSitePath("/projects"),
            queryParams
        );

        return {
            success: true,
            data: {
                projects: response.projects?.project || [],
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
                message: error instanceof Error ? error.message : "Failed to list projects",
                retryable: true
            }
        };
    }
}
