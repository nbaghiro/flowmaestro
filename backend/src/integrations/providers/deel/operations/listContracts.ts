import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DeelClient } from "../client/DeelClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Contracts operation schema
 */
export const listContractsSchema = z.object({
    page: z.number().min(1).optional().describe("Page number (starting from 1)"),
    pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 50)"),
    type: z.enum(["employee", "contractor", "eor"]).optional().describe("Filter by contract type"),
    status: z
        .enum(["active", "terminated", "pending", "draft"])
        .optional()
        .describe("Filter by contract status")
});

export type ListContractsParams = z.infer<typeof listContractsSchema>;

/**
 * List Contracts operation definition
 */
export const listContractsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listContracts",
            name: "List Contracts",
            description: "List all contracts in Deel with pagination and filtering support",
            category: "hr",
            actionType: "read",
            inputSchema: listContractsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Deel", err: error }, "Failed to create listContractsOperation");
        throw new Error(
            `Failed to create listContracts operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list contracts operation
 */
export async function executeListContracts(
    client: DeelClient,
    params: ListContractsParams
): Promise<OperationResult> {
    try {
        const response = await client.listContracts({
            page: params.page,
            page_size: params.pageSize,
            type: params.type,
            status: params.status
        });

        return {
            success: true,
            data: {
                contracts: response.data.map((contract) => ({
                    id: contract.id,
                    personId: contract.person_id,
                    personName: contract.person_name,
                    type: contract.type,
                    status: contract.status,
                    startDate: contract.start_date,
                    endDate: contract.end_date,
                    compensation: {
                        amount: contract.compensation.amount,
                        currency: contract.compensation.currency,
                        frequency: contract.compensation.frequency
                    },
                    jobTitle: contract.job_title,
                    scopeOfWork: contract.scope_of_work,
                    country: contract.country,
                    createdAt: contract.created_at,
                    updatedAt: contract.updated_at
                })),
                pagination: {
                    total: response.pagination.total,
                    page: response.pagination.page,
                    pageSize: response.pagination.page_size,
                    totalPages: response.pagination.total_pages,
                    hasMore: response.pagination.has_more
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list contracts",
                retryable: true
            }
        };
    }
}
