import { z } from "zod";
import { PersonioClient } from "../client/PersonioClient";
import type { PersonioCreateResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Attendance operation schema
 */
export const createAttendanceSchema = z.object({
    employeeId: z.number().describe("The unique identifier of the employee"),
    date: z.string().describe("Date of the attendance record (YYYY-MM-DD)"),
    startTime: z.string().describe("Start time of the work period (HH:MM)"),
    endTime: z.string().describe("End time of the work period (HH:MM)"),
    breakMinutes: z.number().min(0).optional().default(0).describe("Break duration in minutes"),
    comment: z.string().optional().describe("Comment for the attendance record")
});

export type CreateAttendanceParams = z.infer<typeof createAttendanceSchema>;

/**
 * Create Attendance operation definition
 */
export const createAttendanceOperation: OperationDefinition = {
    id: "createAttendance",
    name: "Create Attendance",
    description: "Create a new attendance record for an employee",
    category: "hr",
    inputSchema: createAttendanceSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create attendance operation
 */
export async function executeCreateAttendance(
    client: PersonioClient,
    params: CreateAttendanceParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            employee_id: params.employeeId,
            date: params.date,
            start_time: params.startTime,
            end_time: params.endTime,
            break: params.breakMinutes
        };

        if (params.comment) {
            requestBody.comment = params.comment;
        }

        const response = await client.post<PersonioCreateResponse>(
            "/company/attendances",
            requestBody
        );

        return {
            success: true,
            data: {
                id: response.data.id,
                message: response.data.message || "Attendance created successfully",
                employeeId: params.employeeId,
                date: params.date,
                startTime: params.startTime,
                endTime: params.endTime
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create attendance";

        // Check for specific error cases
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

        if (message.includes("overlap") || message.includes("already exists")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Attendance record already exists for this date and time",
                    retryable: false
                }
            };
        }

        if (message.includes("invalid time") || message.includes("end_time must be after")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Invalid time range: end time must be after start time",
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
