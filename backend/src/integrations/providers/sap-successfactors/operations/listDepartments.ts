import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SAPSuccessFactorsClient } from "../client/SAPSuccessFactorsClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Departments operation schema
 */
export const listDepartmentsSchema = z.object({
    top: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of results to return (1-1000, default 100)"),
    skip: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    filter: z.string().optional().describe("OData filter expression (e.g., \"status eq 'A'\")")
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
            description:
                "List departments from SAP SuccessFactors with OData filtering and pagination",
            category: "hr",
            actionType: "read",
            inputSchema: listDepartmentsSchema,
            retryable: true,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "SAPSuccessFactors", err: error },
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
    client: SAPSuccessFactorsClient,
    params: ListDepartmentsParams
): Promise<OperationResult> {
    try {
        const response = await client.listDepartments({
            top: params.top || 100,
            skip: params.skip,
            filter: params.filter
        });

        const departments = response.d.results.map((dept) => ({
            id: dept.externalCode,
            name: dept.name,
            description: dept.description,
            parentDepartmentId: dept.parentDepartment,
            headOfDepartmentId: dept.headOfDepartment,
            costCenter: dept.costCenter,
            startDate: dept.startDate,
            endDate: dept.endDate,
            status: dept.status
        }));

        const total = response.d.__count ? parseInt(response.d.__count, 10) : null;
        const hasMore = !!response.d.__next;

        return {
            success: true,
            data: {
                departments,
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
                message: error instanceof Error ? error.message : "Failed to list departments",
                retryable: true
            }
        };
    }
}
