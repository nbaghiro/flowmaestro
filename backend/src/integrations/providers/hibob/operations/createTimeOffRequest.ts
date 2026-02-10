import { z } from "zod";
import { HiBobClient } from "../client/HiBobClient";
import type { HiBobCreateTimeOffResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Time Off Request operation schema
 */
export const createTimeOffRequestSchema = z.object({
    employeeId: z.string().min(1).describe("The unique identifier of the employee"),
    policyType: z.string().min(1).describe("The type of time-off policy (e.g., 'holiday', 'sick')"),
    startDate: z.string().describe("Start date of the time-off request (YYYY-MM-DD)"),
    startDatePortion: z
        .enum(["all_day", "morning", "afternoon"])
        .optional()
        .default("all_day")
        .describe("Portion of the start day"),
    endDate: z.string().describe("End date of the time-off request (YYYY-MM-DD)"),
    endDatePortion: z
        .enum(["all_day", "morning", "afternoon"])
        .optional()
        .default("all_day")
        .describe("Portion of the end day"),
    description: z.string().optional().describe("Reason or description for the time-off request"),
    approver: z.string().optional().describe("ID of the approver (defaults to manager)"),
    skipManagerApproval: z
        .boolean()
        .optional()
        .default(false)
        .describe("Skip manager approval (requires admin permissions)")
});

export type CreateTimeOffRequestParams = z.infer<typeof createTimeOffRequestSchema>;

/**
 * Create Time Off Request operation definition
 */
export const createTimeOffRequestOperation: OperationDefinition = {
    id: "createTimeOffRequest",
    name: "Create Time Off Request",
    description: "Submit a new time-off request for an employee",
    category: "hr",
    inputSchema: createTimeOffRequestSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create time off request operation
 */
export async function executeCreateTimeOffRequest(
    client: HiBobClient,
    params: CreateTimeOffRequestParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            policyType: params.policyType,
            startDate: params.startDate,
            startDatePortion: params.startDatePortion,
            endDate: params.endDate,
            endDatePortion: params.endDatePortion
        };

        if (params.description) {
            requestBody.description = params.description;
        }

        if (params.approver) {
            requestBody.approver = params.approver;
        }

        if (params.skipManagerApproval) {
            requestBody.skipManagerApproval = params.skipManagerApproval;
        }

        const response = await client.post<HiBobCreateTimeOffResponse>(
            `/timeoff/employees/${encodeURIComponent(params.employeeId)}/requests`,
            requestBody
        );

        return {
            success: true,
            data: {
                id: response.id,
                requestId: response.requestId,
                status: response.status,
                employeeId: params.employeeId,
                policyType: params.policyType,
                startDate: params.startDate,
                endDate: params.endDate
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to create time off request";

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

        if (message.includes("insufficient balance") || message.includes("not enough")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Insufficient time-off balance for this request",
                    retryable: false
                }
            };
        }

        if (message.includes("overlap") || message.includes("conflict")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Time-off request overlaps with existing request",
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
