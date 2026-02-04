import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { ADPClient } from "../client/ADPClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Company Info operation schema
 */
export const getCompanyInfoSchema = z.object({});

export type GetCompanyInfoParams = z.infer<typeof getCompanyInfoSchema>;

/**
 * Get Company Info operation definition
 */
export const getCompanyInfoOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCompanyInfo",
            name: "Get Company Info",
            description: "Get organization-level company information from ADP",
            category: "hr",
            actionType: "read",
            inputSchema: getCompanyInfoSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "ADP", err: error }, "Failed to create getCompanyInfoOperation");
        throw new Error(
            `Failed to create getCompanyInfo operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get company info operation
 */
export async function executeGetCompanyInfo(
    client: ADPClient,
    _params: GetCompanyInfoParams
): Promise<OperationResult> {
    try {
        const response = await client.getCompanyInfo();

        const departments = response.organizationDepartments || [];

        return {
            success: true,
            data: {
                totalDepartments: departments.length,
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
                message: error instanceof Error ? error.message : "Failed to get company info",
                retryable: true
            }
        };
    }
}
