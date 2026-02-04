import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BambooHRClient } from "../client/BambooHRClient";
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
            description: "List all employees in BambooHR with pagination support",
            category: "hr",
            actionType: "read",
            inputSchema: listEmployeesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BambooHR", err: error },
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
    client: BambooHRClient,
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
                employees: response.data.map((emp) => ({
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
                    hireDate: emp.hireDate
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
