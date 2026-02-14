import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SAPSuccessFactorsClient } from "../client/SAPSuccessFactorsClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Employees operation schema
 */
export const listEmployeesSchema = z.object({
    top: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of results to return (1-1000, default 100)"),
    skip: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    filter: z
        .string()
        .optional()
        .describe("OData filter expression (e.g., \"status eq 'active'\")"),
    status: z
        .enum(["active", "inactive", "all"])
        .optional()
        .describe("Quick filter by employee status")
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
            description:
                "List employees from SAP SuccessFactors with OData filtering and pagination",
            category: "hr",
            actionType: "read",
            inputSchema: listEmployeesSchema,
            retryable: true,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "SAPSuccessFactors", err: error },
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
    client: SAPSuccessFactorsClient,
    params: ListEmployeesParams
): Promise<OperationResult> {
    try {
        // Build filter from status if provided
        let filter = params.filter;
        if (params.status && params.status !== "all") {
            const statusFilter = `status eq '${params.status}'`;
            filter = filter ? `(${filter}) and (${statusFilter})` : statusFilter;
        }

        const response = await client.listEmployees({
            top: params.top || 100,
            skip: params.skip,
            filter
        });

        const employees = response.d.results.map((user) => ({
            id: user.userId,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.displayName,
            email: user.email,
            status: user.status,
            hireDate: user.hireDate,
            department: user.department,
            division: user.division,
            title: user.title,
            managerId: user.managerId,
            location: user.location,
            country: user.country,
            lastModified: user.lastModifiedDateTime
        }));

        const total = response.d.__count ? parseInt(response.d.__count, 10) : null;
        const hasMore = !!response.d.__next;

        return {
            success: true,
            data: {
                employees,
                pagination: {
                    total,
                    top: params.top || 100,
                    skip: params.skip || 0,
                    hasMore,
                    nextLink: response.d.__next || null
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
