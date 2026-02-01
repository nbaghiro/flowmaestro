import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveListResponse, PipedrivePerson } from "../types";

/**
 * List Persons Parameters
 */
export const listPersonsSchema = z.object({
    start: z.number().int().min(0).optional().default(0).describe("Pagination start"),
    limit: z.number().int().min(1).max(500).optional().default(50).describe("Items per page"),
    user_id: z.number().int().optional().describe("Filter by owner user ID"),
    org_id: z.number().int().optional().describe("Filter by organization ID"),
    filter_id: z.number().int().optional().describe("Filter by saved filter ID"),
    sort: z.string().optional().describe("Field to sort by (e.g., 'name ASC')")
});

export type ListPersonsParams = z.infer<typeof listPersonsSchema>;

/**
 * Operation Definition
 */
export const listPersonsOperation: OperationDefinition = {
    id: "listPersons",
    name: "List Contacts",
    description: "Get all contacts (persons) with optional filtering and pagination",
    category: "persons",
    inputSchema: listPersonsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Persons
 */
export async function executeListPersons(
    client: PipedriveClient,
    params: ListPersonsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            start: params.start,
            limit: params.limit
        };

        if (params.user_id !== undefined) {
            queryParams.user_id = params.user_id;
        }
        if (params.org_id !== undefined) {
            queryParams.org_id = params.org_id;
        }
        if (params.filter_id !== undefined) {
            queryParams.filter_id = params.filter_id;
        }
        if (params.sort) {
            queryParams.sort = params.sort;
        }

        const response = await client.get<PipedriveListResponse<PipedrivePerson>>(
            "/persons",
            queryParams
        );

        return {
            success: true,
            data: {
                persons: response.data || [],
                pagination: response.additional_data?.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list contacts",
                retryable: true
            }
        };
    }
}
