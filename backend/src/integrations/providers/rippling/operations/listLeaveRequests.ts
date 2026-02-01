import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { RipplingClient } from "../client/RipplingClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Leave Requests operation schema
 */
export const listLeaveRequestsSchema = z.object({
    startDate: z.string().optional().describe("Filter by leave start date (ISO 8601 format)"),
    endDate: z.string().optional().describe("Filter by leave end date (ISO 8601 format)"),
    status: z
        .enum(["PENDING", "APPROVED", "DECLINED", "CANCELLED"])
        .optional()
        .describe("Filter by leave request status")
});

export type ListLeaveRequestsParams = z.infer<typeof listLeaveRequestsSchema>;

/**
 * List Leave Requests operation definition
 */
export const listLeaveRequestsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listLeaveRequests",
            name: "List Leave Requests",
            description: "Get time-off requests with optional filters for date range and status",
            category: "hr",
            actionType: "read",
            inputSchema: listLeaveRequestsSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Rippling", err: error },
            "Failed to create listLeaveRequestsOperation"
        );
        throw new Error(
            `Failed to create listLeaveRequests operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list leave requests operation
 */
export async function executeListLeaveRequests(
    client: RipplingClient,
    params: ListLeaveRequestsParams
): Promise<OperationResult> {
    try {
        const response = await client.listLeaveRequests({
            startDate: params.startDate,
            endDate: params.endDate,
            status: params.status
        });

        return {
            success: true,
            data: {
                leaveRequests: response.data.map((request) => ({
                    id: request.id,
                    employeeId: request.employeeId,
                    employeeName: request.employeeName,
                    leaveType: request.leaveType,
                    leaveTypeName: request.leaveTypeName,
                    startDate: request.startDate,
                    endDate: request.endDate,
                    totalDays: request.totalDays,
                    status: request.status,
                    reason: request.reason,
                    reviewerId: request.reviewerId,
                    reviewerName: request.reviewerName,
                    reviewedAt: request.reviewedAt,
                    createdAt: request.createdAt,
                    updatedAt: request.updatedAt
                })),
                pagination: {
                    total: response.pagination.total,
                    limit: response.pagination.limit,
                    offset: response.pagination.offset,
                    hasMore: response.pagination.hasMore
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list leave requests",
                retryable: true
            }
        };
    }
}
