import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Get Lists Parameters
 */
export const getListsSchema = z.object({
    nextPageToken: z.string().optional().describe("Token for pagination to get the next page")
});

export type GetListsParams = z.infer<typeof getListsSchema>;

/**
 * Operation Definition
 */
export const getListsOperation: OperationDefinition = {
    id: "getLists",
    name: "Get Lists",
    description: "Get all static lists from Marketo",
    category: "lists",
    inputSchema: getListsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Get Lists
 */
export async function executeGetLists(
    client: MarketoClient,
    params: GetListsParams
): Promise<OperationResult> {
    try {
        const response = await client.getLists(params.nextPageToken);

        if (!response.success) {
            const errorMessage =
                response.errors?.[0]?.message || "Failed to get lists from Marketo";
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                lists: response.result || [],
                nextPageToken: response.nextPageToken,
                hasMore: !!response.nextPageToken
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get lists",
                retryable: false
            }
        };
    }
}
