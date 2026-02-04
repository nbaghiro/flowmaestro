import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BambooHRClient } from "../client/BambooHRClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Employee operation schema
 */
export const getEmployeeSchema = z.object({
    employeeId: z.string().min(1).describe("The unique identifier of the employee"),
    fields: z
        .array(z.string())
        .optional()
        .describe("Specific fields to return (e.g., firstName, lastName, email)")
});

export type GetEmployeeParams = z.infer<typeof getEmployeeSchema>;

/**
 * Get Employee operation definition
 */
export const getEmployeeOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getEmployee",
            name: "Get Employee",
            description: "Get detailed employee information by ID from BambooHR",
            category: "hr",
            actionType: "read",
            inputSchema: getEmployeeSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "BambooHR", err: error },
            "Failed to create getEmployeeOperation"
        );
        throw new Error(
            `Failed to create getEmployee operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get employee operation
 */
export async function executeGetEmployee(
    client: BambooHRClient,
    params: GetEmployeeParams
): Promise<OperationResult> {
    try {
        const response = await client.getEmployee(params.employeeId, params.fields);
        const emp = response.data;

        return {
            success: true,
            data: {
                id: emp.id,
                displayName: emp.displayName,
                firstName: emp.firstName,
                lastName: emp.lastName,
                email: emp.email,
                workEmail: emp.workEmail,
                jobTitle: emp.jobTitle,
                department: emp.department,
                division: emp.division,
                supervisorId: emp.supervisorId,
                supervisorName: emp.supervisorName,
                location: emp.location,
                status: emp.status,
                hireDate: emp.hireDate,
                terminationDate: emp.terminationDate,
                workPhone: emp.workPhone,
                mobilePhone: emp.mobilePhone,
                photoUrl: emp.photoUrl
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get employee",
                retryable: true
            }
        };
    }
}
