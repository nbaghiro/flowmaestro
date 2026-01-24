import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveListResponse, PipedriveDeal } from "../types";

/**
 * List Deals Parameters
 */
export const listDealsSchema = z.object({
    start: z.number().int().min(0).optional().default(0).describe("Pagination start"),
    limit: z.number().int().min(1).max(500).optional().default(50).describe("Items per page"),
    status: z
        .enum(["open", "won", "lost", "deleted", "all_not_deleted"])
        .optional()
        .describe("Filter by deal status"),
    user_id: z.number().int().optional().describe("Filter by owner user ID"),
    stage_id: z.number().int().optional().describe("Filter by pipeline stage ID"),
    sort: z.string().optional().describe("Field to sort by (e.g., 'add_time DESC')")
});

export type ListDealsParams = z.infer<typeof listDealsSchema>;

/**
 * Operation Definition
 */
export const listDealsOperation: OperationDefinition = {
    id: "listDeals",
    name: "List Deals",
    description: "Get all deals with optional filtering and pagination",
    category: "deals",
    inputSchema: listDealsSchema,
    inputSchemaJSON: toJSONSchema(listDealsSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Deals
 */
export async function executeListDeals(
    client: PipedriveClient,
    params: ListDealsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            start: params.start,
            limit: params.limit
        };

        if (params.status) {
            queryParams.status = params.status;
        }
        if (params.user_id !== undefined) {
            queryParams.user_id = params.user_id;
        }
        if (params.stage_id !== undefined) {
            queryParams.stage_id = params.stage_id;
        }
        if (params.sort) {
            queryParams.sort = params.sort;
        }

        const response = await client.get<PipedriveListResponse<PipedriveDeal>>(
            "/deals",
            queryParams
        );

        return {
            success: true,
            data: {
                deals: response.data || [],
                pagination: response.additional_data?.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list deals",
                retryable: true
            }
        };
    }
}
