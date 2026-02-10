import { z } from "zod";
import { RampClient } from "../../client/RampClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { RampTransaction } from "../types";

/**
 * Get Transaction operation schema
 */
export const getTransactionSchema = z.object({
    id: z.string().describe("Transaction ID")
});

export type GetTransactionParams = z.infer<typeof getTransactionSchema>;

/**
 * Get Transaction operation definition
 */
export const getTransactionOperation: OperationDefinition = {
    id: "getTransaction",
    name: "Get Transaction",
    description: "Get a specific transaction by ID",
    category: "transactions",
    inputSchema: getTransactionSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get transaction operation
 */
export async function executeGetTransaction(
    client: RampClient,
    params: GetTransactionParams
): Promise<OperationResult> {
    try {
        const transaction = await client.get<RampTransaction>(
            `/transactions/${encodeURIComponent(params.id)}`
        );

        return {
            success: true,
            data: transaction
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get transaction";

        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Transaction not found",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
