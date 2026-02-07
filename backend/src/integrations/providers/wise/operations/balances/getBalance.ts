import { z } from "zod";
import { WiseClient } from "../../client/WiseClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { WiseBalance } from "../types";

/**
 * Get Balance operation schema
 */
export const getBalanceSchema = z.object({
    profileId: z.number().describe("Profile ID"),
    balanceId: z.number().describe("Balance ID")
});

export type GetBalanceParams = z.infer<typeof getBalanceSchema>;

/**
 * Get Balance operation definition
 */
export const getBalanceOperation: OperationDefinition = {
    id: "getBalance",
    name: "Get Balance",
    description: "Get a specific balance account by ID",
    category: "balances",
    inputSchema: getBalanceSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get balance operation
 */
export async function executeGetBalance(
    client: WiseClient,
    params: GetBalanceParams
): Promise<OperationResult> {
    try {
        const balance = await client.get<WiseBalance>(
            `/v4/profiles/${params.profileId}/balances/${params.balanceId}`
        );

        return {
            success: true,
            data: balance
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get balance";

        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Balance not found",
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
