import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SAPSuccessFactorsClient } from "../client/SAPSuccessFactorsClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Employee operation schema
 */
export const getEmployeeSchema = z.object({
    userId: z.string().min(1).describe("The unique user ID of the employee")
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
            description: "Get detailed information about a specific employee by their user ID",
            category: "hr",
            actionType: "read",
            inputSchema: getEmployeeSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "SAPSuccessFactors", err: error },
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
    client: SAPSuccessFactorsClient,
    params: GetEmployeeParams
): Promise<OperationResult> {
    try {
        const response = await client.getEmployee(params.userId);
        const user = response.d;

        return {
            success: true,
            data: {
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
                timeZone: user.timeZone,
                defaultLocale: user.defaultLocale,
                lastModified: user.lastModifiedDateTime
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
