import { z } from "zod";
import { HiBobClient } from "../client/HiBobClient";
import type { HiBobEmployeesResponse, HiBobEmployee } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Employees operation schema
 */
export const listEmployeesSchema = z.object({
    includeHumanReadable: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include human readable field values"),
    showInactive: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include inactive employees in the results")
});

export type ListEmployeesParams = z.infer<typeof listEmployeesSchema>;

/**
 * List Employees operation definition
 */
export const listEmployeesOperation: OperationDefinition = {
    id: "listEmployees",
    name: "List Employees",
    description: "List all employees in the HiBob organization",
    category: "hr",
    inputSchema: listEmployeesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list employees operation
 */
export async function executeListEmployees(
    client: HiBobClient,
    params: ListEmployeesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string | boolean> = {};

        if (params.includeHumanReadable) {
            queryParams.humanReadable = "true";
        }

        if (params.showInactive) {
            queryParams.showInactive = "true";
        }

        const response = await client.get<HiBobEmployeesResponse>("/people", queryParams);

        const employees = response.employees.map((emp: HiBobEmployee) => ({
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.surname,
            email: emp.email,
            displayName: emp.displayName,
            title: emp.work?.title,
            department: emp.work?.department,
            site: emp.work?.site,
            startDate: emp.work?.startDate,
            status: emp.internal?.status,
            avatarUrl: emp.avatarUrl,
            manager: emp.work?.reportsTo
                ? {
                      id: emp.work.reportsTo.id,
                      displayName: emp.work.reportsTo.displayName,
                      email: emp.work.reportsTo.email
                  }
                : null
        }));

        return {
            success: true,
            data: {
                employees,
                total: employees.length
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
