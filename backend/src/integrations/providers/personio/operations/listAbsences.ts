import { z } from "zod";
import { PersonioClient } from "../client/PersonioClient";
import type { PersonioAbsencesResponse, PersonioAbsence } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Absences operation schema
 */
export const listAbsencesSchema = z.object({
    startDate: z
        .string()
        .optional()
        .describe("Filter absences starting from this date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("Filter absences ending before this date (YYYY-MM-DD)"),
    employeeIds: z.array(z.number()).optional().describe("Filter by specific employee IDs"),
    limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .default(50)
        .describe("Number of absences per page"),
    offset: z.number().min(0).optional().default(0).describe("Offset for pagination")
});

export type ListAbsencesParams = z.infer<typeof listAbsencesSchema>;

/**
 * List Absences operation definition
 */
export const listAbsencesOperation: OperationDefinition = {
    id: "listAbsences",
    name: "List Absences",
    description: "List all absences (time-off periods) in the organization",
    category: "hr",
    inputSchema: listAbsencesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list absences operation
 */
export async function executeListAbsences(
    client: PersonioClient,
    params: ListAbsencesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string | number> = {
            limit: params.limit,
            offset: params.offset
        };

        if (params.startDate) {
            queryParams.start_date = params.startDate;
        }

        if (params.endDate) {
            queryParams.end_date = params.endDate;
        }

        if (params.employeeIds && params.employeeIds.length > 0) {
            queryParams.employees = params.employeeIds.join(",");
        }

        const response = await client.get<PersonioAbsencesResponse>(
            "/company/time-offs",
            queryParams
        );

        const absences = response.data.map((absence: PersonioAbsence) => ({
            id: absence.attributes.id,
            status: absence.attributes.status,
            startDate: absence.attributes.start_date,
            endDate: absence.attributes.end_date,
            daysCount: absence.attributes.days_count,
            halfDayStart: absence.attributes.half_day_start,
            halfDayEnd: absence.attributes.half_day_end,
            comment: absence.attributes.comment,
            timeOffType: {
                id: absence.attributes.time_off_type.attributes.id,
                name: absence.attributes.time_off_type.attributes.name,
                category: absence.attributes.time_off_type.attributes.category
            },
            employee: {
                id: absence.attributes.employee.attributes.id.value,
                firstName: absence.attributes.employee.attributes.first_name.value,
                lastName: absence.attributes.employee.attributes.last_name.value,
                email: absence.attributes.employee.attributes.email.value
            },
            createdAt: absence.attributes.created_at,
            updatedAt: absence.attributes.updated_at
        }));

        return {
            success: true,
            data: {
                absences,
                total: absences.length,
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
                message: error instanceof Error ? error.message : "Failed to list absences",
                retryable: true
            }
        };
    }
}
