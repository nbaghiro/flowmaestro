import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftAccountsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listAccountsSchema = z.object({
    limit: z.number().optional().default(50).describe("Number of accounts to return"),
    cursor: z.string().optional().describe("Pagination cursor")
});

export type ListAccountsParams = z.infer<typeof listAccountsSchema>;

export const listAccountsOperation: OperationDefinition = {
    id: "listAccounts",
    name: "List Accounts",
    description: "List accounts in Drift",
    category: "accounts",
    actionType: "read",
    inputSchema: listAccountsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeListAccounts(
    client: DriftClient,
    params: ListAccountsParams
): Promise<OperationResult> {
    try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.set("limit", String(params.limit));
        if (params.cursor) queryParams.set("cursor", params.cursor);

        const qs = queryParams.toString();
        const response = await client.get<DriftAccountsResponse>(`/accounts${qs ? `?${qs}` : ""}`);

        return {
            success: true,
            data: {
                accounts: response.data.accounts.map((a) => ({
                    accountId: a.accountId,
                    name: a.name,
                    domain: a.domain,
                    ownerId: a.ownerId,
                    targeted: a.targeted,
                    createDateTime: a.createDateTime,
                    updateDateTime: a.updateDateTime
                })),
                pagination: response.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list accounts",
                retryable: true
            }
        };
    }
}
