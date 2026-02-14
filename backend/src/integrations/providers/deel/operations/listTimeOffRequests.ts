import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DeelClient } from "../client/DeelClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Time Off Requests operation schema
 */
export const listTimeOffRequestsSchema = z.object({
    personId: z.string().min(1).describe("The unique identifier of the person"),
    status: z
        .enum(["pending", "approved", "declined", "cancelled"])
        .optional()
        .describe("Filter by request status"),
    startDate: z.string().optional().describe("Filter by start date (ISO 8601 format: YYYY-MM-DD)"),
    endDate: z.string().optional().describe("Filter by end date (ISO 8601 format: YYYY-MM-DD)")
});

export type ListTimeOffRequestsParams = z.infer<typeof listTimeOffRequestsSchema>;

/**
 * List Time Off Requests operation definition
 */
export const listTimeOffRequestsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listTimeOffRequests",
            name: "List Time Off Requests",
            description: "List time off requests for a specific worker with optional filtering",
            category: "hr",
            actionType: "read",
            inputSchema: listTimeOffRequestsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Deel", err: error },
            "Failed to create listTimeOffRequestsOperation"
        );
        throw new Error(
            `Failed to create listTimeOffRequests operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list time off requests operation
 */
export async function executeListTimeOffRequests(
    client: DeelClient,
    params: ListTimeOffRequestsParams
): Promise<OperationResult> {
    try {
        const response = await client.listTimeOffRequests({
            person_id: params.personId,
            status: params.status,
            start_date: params.startDate,
            end_date: params.endDate
        });

        return {
            success: true,
            data: {
                timeOffRequests: response.data.map((request) => ({
                    id: request.id,
                    personId: request.person_id,
                    personName: request.person_name,
                    type: request.type,
                    typeName: request.type_name,
                    startDate: request.start_date,
                    endDate: request.end_date,
                    totalDays: request.total_days,
                    status: request.status,
                    reason: request.reason,
                    reviewerId: request.reviewer_id,
                    reviewerName: request.reviewer_name,
                    reviewedAt: request.reviewed_at,
                    createdAt: request.created_at,
                    updatedAt: request.updated_at
                })),
                pagination: {
                    total: response.pagination.total,
                    page: response.pagination.page,
                    pageSize: response.pagination.page_size,
                    totalPages: response.pagination.total_pages,
                    hasMore: response.pagination.has_more
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to list time off requests",
                retryable: true
            }
        };
    }
}
