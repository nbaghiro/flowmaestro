import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DeelClient } from "../client/DeelClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Contract operation schema
 */
export const getContractSchema = z.object({
    contractId: z.string().min(1).describe("The unique identifier of the contract")
});

export type GetContractParams = z.infer<typeof getContractSchema>;

/**
 * Get Contract operation definition
 */
export const getContractOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getContract",
            name: "Get Contract",
            description: "Get detailed information about a specific contract by its ID",
            category: "hr",
            actionType: "read",
            inputSchema: getContractSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Deel", err: error }, "Failed to create getContractOperation");
        throw new Error(
            `Failed to create getContract operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get contract operation
 */
export async function executeGetContract(
    client: DeelClient,
    params: GetContractParams
): Promise<OperationResult> {
    try {
        const response = await client.getContract(params.contractId);
        const contract = response.data;

        return {
            success: true,
            data: {
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
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contract",
                retryable: true
            }
        };
    }
}
