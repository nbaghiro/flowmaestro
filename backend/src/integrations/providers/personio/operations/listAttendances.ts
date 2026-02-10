import { z } from "zod";
import { PersonioClient } from "../client/PersonioClient";
import type { PersonioAttendancesResponse, PersonioAttendance } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Attendances operation schema
 */
export const listAttendancesSchema = z.object({
    startDate: z.string().describe("Start date for attendance records (YYYY-MM-DD)"),
    endDate: z.string().describe("End date for attendance records (YYYY-MM-DD)"),
    employeeIds: z.array(z.number()).optional().describe("Filter by specific employee IDs"),
    limit: z.number().min(1).max(200).optional().default(50).describe("Number of records per page"),
    offset: z.number().min(0).optional().default(0).describe("Offset for pagination")
});

export type ListAttendancesParams = z.infer<typeof listAttendancesSchema>;

/**
 * List Attendances operation definition
 */
export const listAttendancesOperation: OperationDefinition = {
    id: "listAttendances",
    name: "List Attendances",
    description: "List attendance records for employees within a date range",
    category: "hr",
    inputSchema: listAttendancesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list attendances operation
 */
export async function executeListAttendances(
    client: PersonioClient,
    params: ListAttendancesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string | number> = {
            start_date: params.startDate,
            end_date: params.endDate,
            limit: params.limit,
            offset: params.offset
        };

        if (params.employeeIds && params.employeeIds.length > 0) {
            queryParams.employees = params.employeeIds.join(",");
        }

        const response = await client.get<PersonioAttendancesResponse>(
            "/company/attendances",
            queryParams
        );

        const attendances = response.data.map((attendance: PersonioAttendance) => ({
            id: attendance.attributes.id,
            employeeId: attendance.attributes.employee_id,
            date: attendance.attributes.date,
            startTime: attendance.attributes.start_time,
            endTime: attendance.attributes.end_time,
            breakMinutes: attendance.attributes.break,
            comment: attendance.attributes.comment,
            isHoliday: attendance.attributes.is_holiday,
            isOnTimeOff: attendance.attributes.is_on_time_off,
            status: attendance.attributes.status,
            createdAt: attendance.attributes.created_at,
            updatedAt: attendance.attributes.updated_at
        }));

        return {
            success: true,
            data: {
                attendances,
                total: attendances.length,
                pagination: response.metadata
                    ? {
                          currentPage: response.metadata.current_page,
                          totalPages: response.metadata.total_pages
                      }
                    : null
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list attendances",
                retryable: true
            }
        };
    }
}
