import { z } from "zod";
import { PersonioClient } from "../client/PersonioClient";
import type { PersonioResponse, PersonioEmployee } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Employee operation schema
 */
export const getEmployeeSchema = z.object({
    employeeId: z.number().describe("The unique identifier of the employee")
});

export type GetEmployeeParams = z.infer<typeof getEmployeeSchema>;

/**
 * Get Employee operation definition
 */
export const getEmployeeOperation: OperationDefinition = {
    id: "getEmployee",
    name: "Get Employee",
    description: "Get detailed information about a specific employee by ID",
    category: "hr",
    inputSchema: getEmployeeSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Helper function to extract attribute value
 */
function getAttributeValue<T>(emp: PersonioEmployee, key: string): T | null {
    const attr = emp.attributes[key];
    return attr ? (attr.value as T) : null;
}

/**
 * Execute get employee operation
 */
export async function executeGetEmployee(
    client: PersonioClient,
    params: GetEmployeeParams
): Promise<OperationResult> {
    try {
        const response = await client.get<PersonioResponse<PersonioEmployee>>(
            `/company/employees/${params.employeeId}`
        );

        const emp = response.data;

        const employee = {
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
            team: getAttributeValue<{ value: string }>(emp, "team")?.value || null,
            subcompany: getAttributeValue<{ value: string }>(emp, "subcompany")?.value || null,
            costCenter: getAttributeValue<{ value: string }>(emp, "cost_center")?.value || null
        };

        return {
            success: true,
            data: { employee }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get employee";

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
