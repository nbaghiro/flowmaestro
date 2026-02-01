import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { RipplingClient } from "../client/RipplingClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Process Leave Request operation schema
 */
export const processLeaveRequestSchema = z.object({
    requestId: z.string().min(1).describe("The ID of the leave request to process"),
    action: z.enum(["approve", "decline"]).describe("The action to take on the leave request")
});

export type ProcessLeaveRequestParams = z.infer<typeof processLeaveRequestSchema>;

/**
 * Process Leave Request operation definition
 */
export const processLeaveRequestOperation: OperationDefinition = (() => {
    try {
        return {
            id: "processLeaveRequest",
            name: "Process Leave Request",
            description: "Approve or decline a leave request in Rippling",
            category: "hr",
            actionType: "write",
            inputSchema: processLeaveRequestSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Rippling", err: error },
            "Failed to create processLeaveRequestOperation"
        );
        throw new Error(
            `Failed to create processLeaveRequest operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute process leave request operation
 */
export async function executeProcessLeaveRequest(
    client: RipplingClient,
    params: ProcessLeaveRequestParams
): Promise<OperationResult> {
    try {
        const response = await client.processLeaveRequest(params.requestId, params.action);

        const request = response.data;

        return {
            success: true,
            data: {
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
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to process leave request",
                retryable: false
            }
        };
    }
}
