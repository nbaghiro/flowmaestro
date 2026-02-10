import { z } from "zod";
import { WiseClient } from "../../client/WiseClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { WiseBalance } from "../types";

/**
 * List Balances operation schema
 */
export const listBalancesSchema = z.object({
    profileId: z.number().describe("Profile ID to list balances for")
});

export type ListBalancesParams = z.infer<typeof listBalancesSchema>;

/**
 * List Balances operation definition
 */
export const listBalancesOperation: OperationDefinition = {
    id: "listBalances",
    name: "List Balances",
    description: "List all multi-currency balance accounts for a profile",
    category: "balances",
    inputSchema: listBalancesSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute list balances operation
 */
export async function executeListBalances(
    client: WiseClient,
    params: ListBalancesParams
): Promise<OperationResult> {
    try {
        const balances = await client.get<WiseBalance[]>(
            `/v4/profiles/${params.profileId}/balances?types=STANDARD,SAVINGS`
        );

        return {
            success: true,
            data: {
                balances,
                count: balances.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list balances",
                retryable: true
            }
        };
    }
}
