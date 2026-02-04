import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { ADPClient } from "../client/ADPClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Departments operation schema
 */
export const listDepartmentsSchema = z.object({});

export type ListDepartmentsParams = z.infer<typeof listDepartmentsSchema>;

/**
 * List Departments operation definition
 */
export const listDepartmentsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listDepartments",
            name: "List Departments",
            description: "List all organization departments in ADP",
            category: "hr",
            actionType: "read",
            inputSchema: listDepartmentsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "ADP", err: error }, "Failed to create listDepartmentsOperation");
        throw new Error(
            `Failed to create listDepartments operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list departments operation
 */
export async function executeListDepartments(
    client: ADPClient,
    _params: ListDepartmentsParams
): Promise<OperationResult> {
    try {
        const response = await client.listDepartments();

        const departments = response.organizationDepartments || [];

        return {
            success: true,
            data: {
                departments: departments.map((dept) => ({
                    code: dept.departmentCode?.codeValue,
                    shortName: dept.departmentCode?.shortName,
                    longName: dept.departmentCode?.longName,
                    parentCode: dept.parentDepartmentCode?.codeValue || null
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
