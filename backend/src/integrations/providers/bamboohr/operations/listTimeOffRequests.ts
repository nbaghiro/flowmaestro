import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BambooHRClient } from "../client/BambooHRClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Time Off Requests operation schema
 */
export const listTimeOffRequestsSchema = z.object({
    start: z.string().optional().describe("Start date filter in ISO 8601 format (YYYY-MM-DD)"),
    end: z.string().optional().describe("End date filter in ISO 8601 format (YYYY-MM-DD)"),
    status: z
        .enum(["approved", "denied", "superceded", "requested", "canceled"])
        .optional()
        .describe("Filter by time off request status")
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
            description: "List time off requests in BambooHR with optional date and status filters",
            category: "hr",
            actionType: "read",
            inputSchema: listTimeOffRequestsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BambooHR", err: error },
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
    client: BambooHRClient,
    params: ListTimeOffRequestsParams
): Promise<OperationResult> {
    try {
        const response = await client.listTimeOffRequests({
            start: params.start,
            end: params.end,
            status: params.status
        });

        return {
            success: true,
            data: {
                timeOffRequests: response.data.map((req) => ({
                    id: req.id,
                    employeeId: req.employeeId,
                    employeeName: req.employeeName,
                    start: req.start,
                    end: req.end,
                    type: req.type,
                    amount: req.amount,
                    status: req.status,
                    notes: req.notes,
                    created: req.created
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
                message:
                    error instanceof Error ? error.message : "Failed to list time off requests",
                retryable: true
            }
        };
    }
}
