import { z } from "zod";
import type { ConstantContactListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConstantContactClient } from "../client/ConstantContactClient";

export const getListsSchema = z.object({
    limit: z.number().min(1).max(500).optional().describe("Maximum lists to return (1-500)"),
    cursor: z.string().optional().describe("Pagination cursor for next page")
});

export type GetListsParams = z.infer<typeof getListsSchema>;

export const getListsOperation: OperationDefinition = {
    id: "getLists",
    name: "Get Lists",
    description: "Retrieve all contact lists from Constant Contact",
    category: "lists",
    inputSchema: getListsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetLists(
    client: ConstantContactClient,
    params: GetListsParams
): Promise<OperationResult> {
    try {
        const response = await client.getLists({
            limit: params.limit,
            cursor: params.cursor
        });

        const lists: ConstantContactListOutput[] = response.lists.map((list) => ({
            id: list.list_id,
            name: list.name,
            description: list.description,
            membershipCount: list.membership_count,
            favorite: list.favorite,
            createdAt: list.created_at,
            updatedAt: list.updated_at
        }));

        return {
            success: true,
            data: {
                lists,
                total: lists.length,
                hasMore: !!response._links?.next
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get lists";
        return {
            success: false,
            error: {
                type: message.includes("rate limit") ? "rate_limit" : "server_error",
                message,
                retryable: message.includes("rate limit")
            }
        };
    }
}
