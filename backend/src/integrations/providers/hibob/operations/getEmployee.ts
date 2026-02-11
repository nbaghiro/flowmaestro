import { z } from "zod";
import { HiBobClient } from "../client/HiBobClient";
import type { HiBobEmployee } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Employee operation schema
 */
export const getEmployeeSchema = z.object({
    employeeId: z.string().min(1).describe("The unique identifier of the employee"),
    includeHumanReadable: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include human readable field values")
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
 * Execute get employee operation
 */
export async function executeGetEmployee(
    client: HiBobClient,
    params: GetEmployeeParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.includeHumanReadable) {
            queryParams.humanReadable = "true";
        }

        const emp = await client.get<HiBobEmployee>(
            `/people/${encodeURIComponent(params.employeeId)}`,
            queryParams
        );

        const employee = {
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.surname,
            email: emp.email,
            displayName: emp.displayName,
            personal: emp.personal
                ? {
                      birthDate: emp.personal.shortBirthDate,
                      nationality: emp.personal.nationality,
                      gender: emp.personal.gender
                  }
                : null,
            work: emp.work
                ? {
                      title: emp.work.title,
                      department: emp.work.department,
                      site: emp.work.site,
                      startDate: emp.work.startDate,
                      employmentType: emp.work.employmentType,
                      manager: emp.work.reportsTo
                          ? {
                                id: emp.work.reportsTo.id,
                                displayName: emp.work.reportsTo.displayName,
                                email: emp.work.reportsTo.email
                            }
                          : null
                  }
                : null,
            status: emp.internal?.status,
            terminationDate: emp.internal?.terminationDate,
            avatarUrl: emp.avatarUrl,
            createdAt: emp.creationDateTime
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
