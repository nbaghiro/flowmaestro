import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { RipplingClient } from "../client/RipplingClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Employee operation schema
 */
export const getEmployeeSchema = z.object({
    employeeId: z.string().min(1).describe("The unique identifier of the employee")
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
            description: "Get detailed employee information by ID",
            category: "hr",
            actionType: "read",
            inputSchema: getEmployeeSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Rippling", err: error },
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
    client: RipplingClient,
    params: GetEmployeeParams
): Promise<OperationResult> {
    try {
        const response = await client.getEmployee(params.employeeId);
        const employee = response.data;

        return {
            success: true,
            data: {
                id: employee.id,
                displayName: employee.displayName,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                personalEmail: employee.personalEmail,
                phone: employee.phone,
                title: employee.title,
                department: employee.department,
                managerId: employee.managerId,
                managerName: employee.managerName,
                startDate: employee.startDate,
                endDate: employee.endDate,
                employmentType: employee.employmentType,
                employmentStatus: employee.employmentStatus,
                workLocation: employee.workLocation,
                team: employee.team,
                flsaStatus: employee.flsaStatus,
                isManager: employee.isManager,
                createdAt: employee.createdAt,
                updatedAt: employee.updatedAt
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
