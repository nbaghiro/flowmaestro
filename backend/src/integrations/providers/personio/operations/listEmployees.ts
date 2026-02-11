import { z } from "zod";
import { PersonioClient } from "../client/PersonioClient";
import type { PersonioEmployeesResponse, PersonioEmployee } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Employees operation schema
 */
export const listEmployeesSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .default(50)
        .describe("Number of employees to return per page"),
    offset: z.number().min(0).optional().default(0).describe("Offset for pagination"),
    updatedSince: z
        .string()
        .optional()
        .describe("Filter employees updated since this date (ISO 8601 format)")
});

export type ListEmployeesParams = z.infer<typeof listEmployeesSchema>;

/**
 * List Employees operation definition
 */
export const listEmployeesOperation: OperationDefinition = {
    id: "listEmployees",
    name: "List Employees",
    description: "List all employees in the Personio organization",
    category: "hr",
    inputSchema: listEmployeesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Helper function to extract attribute value
 */
function getAttributeValue<T>(emp: PersonioEmployee, key: string): T | null {
    const attr = emp.attributes[key];
    return attr ? (attr.value as T) : null;
}

/**
 * Execute list employees operation
 */
export async function executeListEmployees(
    client: PersonioClient,
    params: ListEmployeesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string | number> = {
            limit: params.limit,
            offset: params.offset
        };

        if (params.updatedSince) {
            queryParams.updated_since = params.updatedSince;
        }

        const response = await client.get<PersonioEmployeesResponse>(
            "/company/employees",
            queryParams
        );

        const employees = response.data.map((emp: PersonioEmployee) => ({
            id: getAttributeValue<number>(emp, "id"),
            firstName: getAttributeValue<string>(emp, "first_name"),
            lastName: getAttributeValue<string>(emp, "last_name"),
            email: getAttributeValue<string>(emp, "email"),
            gender: getAttributeValue<string>(emp, "gender"),
            status: getAttributeValue<string>(emp, "status"),
            position: getAttributeValue<string>(emp, "position"),
            department: getAttributeValue<{ value: string }>(emp, "department")?.value || null,
            office: getAttributeValue<{ value: string }>(emp, "office")?.value || null,
            hireDate: getAttributeValue<string>(emp, "hire_date"),
            terminationDate: getAttributeValue<string>(emp, "termination_date"),
            employmentType: getAttributeValue<string>(emp, "employment_type"),
            weeklyWorkingHours: getAttributeValue<number>(emp, "weekly_working_hours"),
            supervisor:
                getAttributeValue<{ value: { first_name: string; last_name: string; id: number } }>(
                    emp,
                    "supervisor"
                )?.value || null,
            team: getAttributeValue<{ value: string }>(emp, "team")?.value || null
        }));

        return {
            success: true,
            data: {
                employees,
                total: employees.length,
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
                message: error instanceof Error ? error.message : "Failed to list employees",
                retryable: true
            }
        };
    }
}
