import { z } from "zod";
import { PersonioClient } from "../client/PersonioClient";
import type { PersonioCreateResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Absence operation schema
 */
export const createAbsenceSchema = z.object({
    employeeId: z.number().describe("The unique identifier of the employee"),
    timeOffTypeId: z.number().describe("The ID of the time-off type (e.g., vacation, sick leave)"),
    startDate: z.string().describe("Start date of the absence (YYYY-MM-DD)"),
    endDate: z.string().describe("End date of the absence (YYYY-MM-DD)"),
    halfDayStart: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether the absence starts at half day"),
    halfDayEnd: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether the absence ends at half day"),
    comment: z.string().optional().describe("Comment or reason for the absence"),
    skipApproval: z
        .boolean()
        .optional()
        .default(false)
        .describe("Skip the approval workflow (requires admin permissions)")
});

export type CreateAbsenceParams = z.infer<typeof createAbsenceSchema>;

/**
 * Create Absence operation definition
 */
export const createAbsenceOperation: OperationDefinition = {
    id: "createAbsence",
    name: "Create Absence",
    description: "Create a new absence (time-off) request for an employee",
    category: "hr",
    inputSchema: createAbsenceSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create absence operation
 */
export async function executeCreateAbsence(
    client: PersonioClient,
    params: CreateAbsenceParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            employee_id: params.employeeId,
            time_off_type_id: params.timeOffTypeId,
            start_date: params.startDate,
            end_date: params.endDate,
            half_day_start: params.halfDayStart,
            half_day_end: params.halfDayEnd
        };

        if (params.comment) {
            requestBody.comment = params.comment;
        }

        if (params.skipApproval) {
            requestBody.skip_approval = params.skipApproval;
        }

        const response = await client.post<PersonioCreateResponse>(
            "/company/time-offs",
            requestBody
        );

        return {
            success: true,
            data: {
                id: response.data.id,
                message: response.data.message || "Absence created successfully",
                employeeId: params.employeeId,
                startDate: params.startDate,
                endDate: params.endDate
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create absence";

        // Check for specific error cases
        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Employee or time-off type not found",
                    retryable: false
                }
            };
        }

        if (
            message.includes("overlap") ||
            message.includes("conflict") ||
            message.includes("already exists")
        ) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Absence overlaps with existing time-off period",
                    retryable: false
                }
            };
        }

        if (message.includes("balance") || message.includes("insufficient")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Insufficient time-off balance for this request",
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
