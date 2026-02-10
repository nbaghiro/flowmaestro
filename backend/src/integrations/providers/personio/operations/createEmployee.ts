import { z } from "zod";
import { PersonioClient } from "../client/PersonioClient";
import type { PersonioCreateResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Employee operation schema
 */
export const createEmployeeSchema = z.object({
    firstName: z.string().min(1).describe("Employee's first name"),
    lastName: z.string().min(1).describe("Employee's last name"),
    email: z.string().email().describe("Employee's email address"),
    gender: z.enum(["male", "female", "diverse"]).optional().describe("Employee's gender"),
    position: z.string().optional().describe("Job position/title"),
    department: z.string().optional().describe("Department name"),
    office: z.string().optional().describe("Office location"),
    hireDate: z.string().optional().describe("Hire date (YYYY-MM-DD)"),
    employmentType: z
        .string()
        .optional()
        .describe("Employment type (e.g., 'full-time', 'part-time')"),
    weeklyWorkingHours: z.number().min(0).max(168).optional().describe("Weekly working hours"),
    supervisorId: z.number().optional().describe("ID of the employee's supervisor")
});

export type CreateEmployeeParams = z.infer<typeof createEmployeeSchema>;

/**
 * Create Employee operation definition
 */
export const createEmployeeOperation: OperationDefinition = {
    id: "createEmployee",
    name: "Create Employee",
    description: "Create a new employee in Personio",
    category: "hr",
    inputSchema: createEmployeeSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create employee operation
 */
export async function executeCreateEmployee(
    client: PersonioClient,
    params: CreateEmployeeParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            first_name: params.firstName,
            last_name: params.lastName,
            email: params.email
        };

        if (params.gender) {
            requestBody.gender = params.gender;
        }

        if (params.position) {
            requestBody.position = params.position;
        }

        if (params.department) {
            requestBody.department = params.department;
        }

        if (params.office) {
            requestBody.office = params.office;
        }

        if (params.hireDate) {
            requestBody.hire_date = params.hireDate;
        }

        if (params.employmentType) {
            requestBody.employment_type = params.employmentType;
        }

        if (params.weeklyWorkingHours !== undefined) {
            requestBody.weekly_working_hours = params.weeklyWorkingHours;
        }

        if (params.supervisorId) {
            requestBody.supervisor_id = params.supervisorId;
        }

        const response = await client.post<PersonioCreateResponse>(
            "/company/employees",
            requestBody
        );

        return {
            success: true,
            data: {
                id: response.data.id,
                message: response.data.message || "Employee created successfully",
                firstName: params.firstName,
                lastName: params.lastName,
                email: params.email
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create employee";

        // Check for duplicate email error
        if (
            message.includes("email") &&
            (message.includes("exists") || message.includes("duplicate"))
        ) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `An employee with email ${params.email} already exists`,
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
