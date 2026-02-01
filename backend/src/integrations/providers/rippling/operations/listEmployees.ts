import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { RipplingClient } from "../client/RipplingClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Employees operation schema
 */
export const listEmployeesSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 50)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination")
});

export type ListEmployeesParams = z.infer<typeof listEmployeesSchema>;

/**
 * List Employees operation definition
 */
export const listEmployeesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listEmployees",
            name: "List Employees",
            description: "List all active employees in Rippling with pagination support",
            category: "hr",
            actionType: "read",
            inputSchema: listEmployeesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Rippling", err: error },
            "Failed to create listEmployeesOperation"
        );
        throw new Error(
            `Failed to create listEmployees operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list employees operation
 */
export async function executeListEmployees(
    client: RipplingClient,
    params: ListEmployeesParams
): Promise<OperationResult> {
    try {
        const response = await client.listEmployees({
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                employees: response.data.map((employee) => ({
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
                    isManager: employee.isManager
                })),
                pagination: {
                    total: response.pagination.total,
                    limit: response.pagination.limit,
                    offset: response.pagination.offset,
                    hasMore: response.pagination.hasMore
                }
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
