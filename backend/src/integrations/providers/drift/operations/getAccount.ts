import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftAccountResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getAccountSchema = z.object({
    account_id: z.string().describe("Account ID")
});

export type GetAccountParams = z.infer<typeof getAccountSchema>;

export const getAccountOperation: OperationDefinition = {
    id: "getAccount",
    name: "Get Account",
    description: "Get a specific account by ID",
    category: "accounts",
    actionType: "read",
    inputSchema: getAccountSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetAccount(
    client: DriftClient,
    params: GetAccountParams
): Promise<OperationResult> {
    try {
        const response = await client.get<DriftAccountResponse>(`/accounts/${params.account_id}`);

        const a = response.data;
        return {
            success: true,
            data: {
                accountId: a.accountId,
                name: a.name,
                domain: a.domain,
                ownerId: a.ownerId,
                targeted: a.targeted,
                customProperties: a.customProperties,
                createDateTime: a.createDateTime,
                updateDateTime: a.updateDateTime
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get account",
                retryable: true
            }
        };
    }
}
