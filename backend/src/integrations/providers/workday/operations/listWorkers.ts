import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WorkdayClient } from "../client/WorkdayClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Workers operation schema
 */
export const listWorkersSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of results per page (1-100)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination")
});

export type ListWorkersParams = z.infer<typeof listWorkersSchema>;

/**
 * List Workers operation definition
 */
export const listWorkersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listWorkers",
            name: "List Workers",
            description: "List all workers in the Workday organization with pagination support",
            category: "hr",
            actionType: "read",
            inputSchema: listWorkersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Workday", err: error }, "Failed to create listWorkersOperation");
        throw new Error(
            `Failed to create listWorkers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list workers operation
 */
export async function executeListWorkers(
    client: WorkdayClient,
    params: ListWorkersParams
): Promise<OperationResult> {
    try {
        const response = await client.listWorkers({
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                workers: response.data.map((worker) => ({
                    id: worker.id,
                    workerId: worker.workerId,
                    firstName: worker.firstName,
                    lastName: worker.lastName,
                    fullName: worker.fullName,
                    email: worker.email,
                    businessTitle: worker.businessTitle,
                    department: worker.department,
                    supervisorId: worker.supervisorId,
                    supervisorName: worker.supervisorName,
                    hireDate: worker.hireDate,
                    terminationDate: worker.terminationDate,
                    workerType: worker.workerType,
                    location: worker.location,
                    employeeStatus: worker.employeeStatus,
                    timeType: worker.timeType,
                    payType: worker.payType
                })),
                pagination: {
                    total: response.total,
                    offset: response.offset,
                    limit: response.limit
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list workers",
                retryable: true
            }
        };
    }
}
