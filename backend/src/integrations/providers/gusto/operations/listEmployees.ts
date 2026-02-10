import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { GustoClient } from "../client/GustoClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Employees operation schema
 */
export const listEmployeesSchema = z.object({
    companyId: z.string().describe("The Gusto company UUID"),
    page: z.number().min(1).optional().describe("Page number (starts at 1)"),
    per: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 25)")
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
            description: "List all employees for a company in Gusto",
            category: "hr",
            actionType: "read",
            inputSchema: listEmployeesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Gusto", err: error }, "Failed to create listEmployeesOperation");
        throw new Error(
            `Failed to create listEmployees operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list employees operation
 */
export async function executeListEmployees(
    client: GustoClient,
    params: ListEmployeesParams
): Promise<OperationResult> {
    try {
        const response = await client.listEmployees(params.companyId, {
            page: params.page,
            per: params.per
        });

        return {
            success: true,
            data: {
                employees: response.map((employee) => ({
                    uuid: employee.uuid,
                    firstName: employee.first_name,
                    lastName: employee.last_name,
                    email: employee.email,
                    companyUuid: employee.company_uuid,
                    managerUuid: employee.manager_uuid,
                    department: employee.department,
                    dateOfBirth: employee.date_of_birth,
                    currentJobTitle: employee.jobs?.[0]?.title || null,
                    hireDate: employee.jobs?.[0]?.hire_date || null,
                    onboarded: employee.onboarded,
                    terminated: employee.terminated,
                    homeAddress: employee.home_address
                        ? {
                              street1: employee.home_address.street_1,
                              street2: employee.home_address.street_2,
                              city: employee.home_address.city,
                              state: employee.home_address.state,
                              zip: employee.home_address.zip,
                              country: employee.home_address.country
                          }
                        : null
                }))
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
