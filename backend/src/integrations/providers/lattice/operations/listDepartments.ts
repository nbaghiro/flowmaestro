import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { LatticeClient } from "../client/LatticeClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Departments operation schema
 */
export const listDepartmentsSchema = z.object({
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 50)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination")
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
            description: "List all departments in Lattice with pagination support",
            category: "hr",
            actionType: "read",
            inputSchema: listDepartmentsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Lattice", err: error },
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
    client: LatticeClient,
    params: ListDepartmentsParams
): Promise<OperationResult> {
    try {
        const response = await client.listDepartments({
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                departments: response.data.map((dept) => ({
                    id: dept.id,
                    name: dept.name,
                    parentId: dept.parentId,
                    parentName: dept.parentName,
                    headId: dept.headId,
                    headName: dept.headName,
                    memberCount: dept.memberCount,
                    createdAt: dept.createdAt,
                    updatedAt: dept.updatedAt
                })),
                pagination: {
                    total: response.pagination.total,
                    limit: response.pagination.limit,
                    offset: response.pagination.offset,
                    hasMore: response.pagination.hasMore
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
