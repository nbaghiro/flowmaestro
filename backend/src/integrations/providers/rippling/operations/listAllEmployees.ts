import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { RipplingClient } from "../client/RipplingClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List All Employees operation schema
 */
export const listAllEmployeesSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 50)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination")
});

export type ListAllEmployeesParams = z.infer<typeof listAllEmployeesSchema>;

/**
 * List All Employees operation definition
 */
export const listAllEmployeesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listAllEmployees",
            name: "List All Employees",
            description: "List all employees in Rippling, including terminated employees",
            category: "hr",
            actionType: "read",
            inputSchema: listAllEmployeesSchema,
            inputSchemaJSON: toJSONSchema(listAllEmployeesSchema),
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Rippling", err: error },
            "Failed to create listAllEmployeesOperation"
        );
        throw new Error(
            `Failed to create listAllEmployees operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list all employees operation
 */
export async function executeListAllEmployees(
    client: RipplingClient,
    params: ListAllEmployeesParams
): Promise<OperationResult> {
    try {
        const response = await client.listAllEmployees({
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
                message: error instanceof Error ? error.message : "Failed to list all employees",
                retryable: true
            }
        };
    }
}
