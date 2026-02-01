import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveListResponse, PipedriveOrganization } from "../types";

/**
 * List Organizations Parameters
 */
export const listOrganizationsSchema = z.object({
    start: z.number().int().min(0).optional().default(0).describe("Pagination start"),
    limit: z.number().int().min(1).max(500).optional().default(50).describe("Items per page"),
    user_id: z.number().int().optional().describe("Filter by owner user ID"),
    filter_id: z.number().int().optional().describe("Filter by saved filter ID"),
    sort: z.string().optional().describe("Field to sort by (e.g., 'name ASC')")
});

export type ListOrganizationsParams = z.infer<typeof listOrganizationsSchema>;

/**
 * Operation Definition
 */
export const listOrganizationsOperation: OperationDefinition = {
    id: "listOrganizations",
    name: "List Organizations",
    description: "Get all organizations with optional filtering and pagination",
    category: "organizations",
    inputSchema: listOrganizationsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Organizations
 */
export async function executeListOrganizations(
    client: PipedriveClient,
    params: ListOrganizationsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            start: params.start,
            limit: params.limit
        };

        if (params.user_id !== undefined) {
            queryParams.user_id = params.user_id;
        }
        if (params.filter_id !== undefined) {
            queryParams.filter_id = params.filter_id;
        }
        if (params.sort) {
            queryParams.sort = params.sort;
        }

        const response = await client.get<PipedriveListResponse<PipedriveOrganization>>(
            "/organizations",
            queryParams
        );

        return {
            success: true,
            data: {
                organizations: response.data || [],
                pagination: response.additional_data?.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list organizations",
                retryable: true
            }
        };
    }
}
