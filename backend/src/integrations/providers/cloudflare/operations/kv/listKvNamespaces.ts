import { z } from "zod";
import { PaginationSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloudflareClient } from "../../client/CloudflareClient";

/**
 * List KV Namespaces operation schema
 */
export const listKvNamespacesSchema = PaginationSchema;

export type ListKvNamespacesParams = z.infer<typeof listKvNamespacesSchema>;

/**
 * List KV Namespaces operation definition
 */
export const listKvNamespacesOperation: OperationDefinition = {
    id: "kv_listNamespaces",
    name: "List KV Namespaces",
    description: "List all KV namespaces in the account",
    category: "kv",
    inputSchema: listKvNamespacesSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list KV namespaces operation
 */
export async function executeListKvNamespaces(
    client: CloudflareClient,
    params: ListKvNamespacesParams
): Promise<OperationResult> {
    try {
        const response = await client.listKVNamespaces(params);

        return {
            success: true,
            data: {
                namespaces: response.namespaces.map((ns) => ({
                    id: ns.id,
                    title: ns.title,
                    supportsUrlEncoding: ns.supports_url_encoding
                })),
                pagination: response.result_info
                    ? {
                          page: response.result_info.page,
                          perPage: response.result_info.per_page,
                          totalPages: response.result_info.total_pages,
                          totalCount: response.result_info.total_count
                      }
                    : undefined,
                accountId: client.getAccountId()
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list KV namespaces",
                retryable: true
            }
        };
    }
}
