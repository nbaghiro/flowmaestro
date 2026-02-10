import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { GustoClient } from "../client/GustoClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Departments operation schema
 */
export const listDepartmentsSchema = z.object({
    companyId: z.string().describe("The Gusto company UUID")
});

export type ListDepartmentsParams = z.infer<typeof listDepartmentsSchema>;

/**
 * List Departments operation definition
 */
export const listDepartmentsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listDepartments",
            name: "List Departments",
            description: "List all departments for a company in Gusto",
            category: "hr",
            actionType: "read",
            inputSchema: listDepartmentsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Gusto", err: error },
            "Failed to create listDepartmentsOperation"
        );
        throw new Error(
            `Failed to create listDepartments operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list departments operation
 */
export async function executeListDepartments(
    client: GustoClient,
    params: ListDepartmentsParams
): Promise<OperationResult> {
    try {
        const departments = await client.listDepartments(params.companyId);

        return {
            success: true,
            data: {
                departments: departments.map((dept) => ({
                    uuid: dept.uuid,
                    title: dept.title,
                    employeeCount: dept.employees?.length || 0,
                    employees: dept.employees?.map((emp) => ({
                        uuid: emp.uuid,
                        fullName: emp.full_name
                    })),
                    contractorCount: dept.contractors?.length || 0,
                    contractors: dept.contractors?.map((c) => ({
                        uuid: c.uuid,
                        fullName: c.full_name
                    }))
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list departments",
                retryable: true
            }
        };
    }
}
