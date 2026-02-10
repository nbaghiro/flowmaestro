import { z } from "zod";
import { ExpensifyClient } from "../../client/ExpensifyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Manage Employees operation schema
 */
export const manageEmployeesSchema = z.object({
    policyID: z.string().describe("Policy ID"),
    employees: z.array(
        z.object({
            email: z.string().email().describe("Employee email"),
            action: z.enum(["add", "update", "delete"]).describe("Action to perform"),
            role: z.enum(["admin", "user", "auditor"]).optional(),
            approvalLimit: z.number().min(0).optional().describe("Approval limit in cents")
        })
    )
});

export type ManageEmployeesParams = z.infer<typeof manageEmployeesSchema>;

/**
 * Manage Employees operation definition
 */
export const manageEmployeesOperation: OperationDefinition = {
    id: "manageEmployees",
    name: "Manage Employees",
    description: "Add, update, or remove employees from a policy",
    category: "employees",
    inputSchema: manageEmployeesSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute manage employees operation
 */
export async function executeManageEmployees(
    client: ExpensifyClient,
    params: ManageEmployeesParams
): Promise<OperationResult> {
    try {
        const inputSettings = {
            type: "employees",
            policyID: params.policyID,
            employees: params.employees.map((emp) => ({
                ...emp,
                employeeEmail: emp.email
            }))
        };

        const response = await client.executeJob("update", inputSettings);

        return {
            success: true,
            data: {
                policyID: params.policyID,
                processed: params.employees.length,
                ...response
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to manage employees";

        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Policy not found",
                    retryable: false
                }
            };
        }

        if (message.includes("validation")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message,
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
