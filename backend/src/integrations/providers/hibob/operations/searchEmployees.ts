import { z } from "zod";
import { HiBobClient } from "../client/HiBobClient";
import type { HiBobSearchResponse, HiBobEmployee } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Search Employees operation schema
 */
export const searchEmployeesSchema = z.object({
    fields: z
        .array(z.string())
        .optional()
        .describe("Fields to return in the response (e.g., ['firstName', 'surname', 'email'])"),
    filters: z
        .array(
            z.object({
                fieldPath: z.string().describe("The field to filter on (e.g., 'work.department')"),
                operator: z
                    .enum(["equals", "notEquals", "contains", "startsWith", "endsWith", "in"])
                    .describe("The filter operator"),
                values: z.array(z.string()).describe("The values to filter by")
            })
        )
        .optional()
        .describe("Filters to apply to the search"),
    showInactive: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include inactive employees in results")
});

export type SearchEmployeesParams = z.infer<typeof searchEmployeesSchema>;

/**
 * Search Employees operation definition
 */
export const searchEmployeesOperation: OperationDefinition = {
    id: "searchEmployees",
    name: "Search Employees",
    description: "Search for employees using filters and field selection",
    category: "hr",
    inputSchema: searchEmployeesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute search employees operation
 */
export async function executeSearchEmployees(
    client: HiBobClient,
    params: SearchEmployeesParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            showInactive: params.showInactive
        };

        if (params.fields && params.fields.length > 0) {
            requestBody.fields = params.fields;
        }

        if (params.filters && params.filters.length > 0) {
            requestBody.filters = params.filters.map((f) => ({
                fieldPath: f.fieldPath,
                operator: f.operator,
                values: f.values
            }));
        }

        const response = await client.post<HiBobSearchResponse>("/people/search", requestBody);

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
                total: response.totalCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search employees",
                retryable: true
            }
        };
    }
}
