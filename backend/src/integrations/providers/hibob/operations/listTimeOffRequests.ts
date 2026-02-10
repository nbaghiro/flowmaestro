import { z } from "zod";
import { HiBobClient } from "../client/HiBobClient";
import type { HiBobTimeOffRequestsResponse, HiBobTimeOffRequest } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Time Off Requests operation schema
 */
export const listTimeOffRequestsSchema = z.object({
    employeeId: z.string().min(1).describe("The unique identifier of the employee"),
    fromDate: z
        .string()
        .optional()
        .describe("Filter requests starting from this date (YYYY-MM-DD)"),
    toDate: z.string().optional().describe("Filter requests until this date (YYYY-MM-DD)")
});

export type ListTimeOffRequestsParams = z.infer<typeof listTimeOffRequestsSchema>;

/**
 * List Time Off Requests operation definition
 */
export const listTimeOffRequestsOperation: OperationDefinition = {
    id: "listTimeOffRequests",
    name: "List Time Off Requests",
    description: "List all time-off requests for a specific employee",
    category: "hr",
    inputSchema: listTimeOffRequestsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list time off requests operation
 */
export async function executeListTimeOffRequests(
    client: HiBobClient,
    params: ListTimeOffRequestsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.fromDate) {
            queryParams.from = params.fromDate;
        }

        if (params.toDate) {
            queryParams.to = params.toDate;
        }

        const response = await client.get<HiBobTimeOffRequestsResponse>(
            `/timeoff/employees/${encodeURIComponent(params.employeeId)}/requests`,
            queryParams
        );

        const requests = response.requests.map((req: HiBobTimeOffRequest) => ({
            id: req.id,
            requestId: req.requestId,
            employeeId: req.employeeId,
            employeeDisplayName: req.employeeDisplayName,
            policyType: req.policyType,
            policyTypeDisplayName: req.policyTypeDisplayName,
            type: req.type,
            status: req.status,
            startDate: req.startDate,
            startDatePortion: req.startDatePortion,
            endDate: req.endDate,
            endDatePortion: req.endDatePortion,
            requestedDays: req.requestedDays,
            description: req.description,
            approver: req.approver
                ? {
                      id: req.approver.id,
                      displayName: `${req.approver.firstName} ${req.approver.surname}`,
                      email: req.approver.email
                  }
                : null,
            createdAt: req.creationDateTime
        }));

        return {
            success: true,
            data: {
                requests,
                total: requests.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list time off requests";

        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Employee not found: ${params.employeeId}`,
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
