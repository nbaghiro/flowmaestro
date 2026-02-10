import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoListResponse, ZohoAccount } from "../types";

/**
 * List Accounts Parameters
 */
export const listAccountsSchema = z.object({
    page: z.number().min(1).optional().default(1),
    per_page: z.number().min(1).max(200).optional().default(200),
    fields: z.array(z.string()).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(["asc", "desc"]).optional()
});

export type ListAccountsParams = z.infer<typeof listAccountsSchema>;

/**
 * Operation Definition
 */
export const listAccountsOperation: OperationDefinition = {
    id: "listAccounts",
    name: "List Accounts",
    description: "List all accounts with pagination",
    category: "crm",
    inputSchema: listAccountsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Accounts
 */
export async function executeListAccounts(
    client: ZohoCrmClient,
    params: ListAccountsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            page: params.page,
            per_page: params.per_page
        };

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        if (params.sort_by) {
            queryParams.sort_by = params.sort_by;
        }

        if (params.sort_order) {
            queryParams.sort_order = params.sort_order;
        }

        const response = await client.get<ZohoListResponse<ZohoAccount>>(
            "/crm/v8/Accounts",
            queryParams
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list accounts",
                retryable: false
            }
        };
    }
}
