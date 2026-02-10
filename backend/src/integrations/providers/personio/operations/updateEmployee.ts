import { z } from "zod";
import { PersonioClient } from "../client/PersonioClient";
import type { PersonioCreateResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Update Employee operation schema
 */
export const updateEmployeeSchema = z.object({
    employeeId: z.number().describe("The unique identifier of the employee"),
    firstName: z.string().min(1).optional().describe("Employee's first name"),
    lastName: z.string().min(1).optional().describe("Employee's last name"),
    email: z.string().email().optional().describe("Employee's email address"),
    gender: z.enum(["male", "female", "diverse"]).optional().describe("Employee's gender"),
    position: z.string().optional().describe("Job position/title"),
    department: z.string().optional().describe("Department name"),
    office: z.string().optional().describe("Office location"),
    employmentType: z.string().optional().describe("Employment type"),
    weeklyWorkingHours: z.number().min(0).max(168).optional().describe("Weekly working hours"),
    supervisorId: z.number().optional().describe("ID of the employee's supervisor"),
    terminationDate: z.string().optional().describe("Termination date (YYYY-MM-DD)")
});

export type UpdateEmployeeParams = z.infer<typeof updateEmployeeSchema>;

/**
 * Update Employee operation definition
 */
export const updateEmployeeOperation: OperationDefinition = {
    id: "updateEmployee",
    name: "Update Employee",
    description: "Update an existing employee's information in Personio",
    category: "hr",
    inputSchema: updateEmployeeSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute update employee operation
 */
export async function executeUpdateEmployee(
    client: PersonioClient,
    params: UpdateEmployeeParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {};

        if (params.firstName !== undefined) {
            requestBody.first_name = params.firstName;
        }

        if (params.lastName !== undefined) {
            requestBody.last_name = params.lastName;
        }

        if (params.email !== undefined) {
            requestBody.email = params.email;
        }

        if (params.gender !== undefined) {
            requestBody.gender = params.gender;
        }

        if (params.position !== undefined) {
            requestBody.position = params.position;
        }

        if (params.department !== undefined) {
            requestBody.department = params.department;
        }

        if (params.office !== undefined) {
            requestBody.office = params.office;
        }

        if (params.employmentType !== undefined) {
            requestBody.employment_type = params.employmentType;
        }

        if (params.weeklyWorkingHours !== undefined) {
            requestBody.weekly_working_hours = params.weeklyWorkingHours;
        }

        if (params.supervisorId !== undefined) {
            requestBody.supervisor_id = params.supervisorId;
        }

        if (params.terminationDate !== undefined) {
            requestBody.termination_date = params.terminationDate;
        }

        // Check if there are any fields to update
        if (Object.keys(requestBody).length === 0) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "At least one field must be provided for update",
                    retryable: false
                }
            };
        }

        const response = await client.patch<PersonioCreateResponse>(
            `/company/employees/${params.employeeId}`,
            requestBody
        );

        return {
            success: true,
            data: {
                id: params.employeeId,
                message: response.data?.message || "Employee updated successfully",
                updatedFields: Object.keys(requestBody)
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update employee";

        // Check if it's a not found error
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
