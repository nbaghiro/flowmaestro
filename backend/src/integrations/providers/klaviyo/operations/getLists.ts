import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

/**
 * Get Lists Parameters
 */
export const getListsSchema = z.object({
    pageSize: z.number().min(1).max(100).optional().describe("Number of lists per page (max 100)"),
    pageCursor: z.string().optional().describe("Cursor for pagination")
});

export type GetListsParams = z.infer<typeof getListsSchema>;

/**
 * Operation Definition
 */
export const getListsOperation: OperationDefinition = {
    id: "getLists",
    name: "Get Lists",
    description: "Get all lists from Klaviyo",
    category: "lists",
    inputSchema: getListsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Get Lists
 */
export async function executeGetLists(
    client: KlaviyoClient,
    params: GetListsParams
): Promise<OperationResult> {
    try {
        const response = await client.getLists({
            pageSize: params.pageSize,
            pageCursor: params.pageCursor
        });

        // Extract next cursor from links
        let nextCursor: string | undefined;
        if (response.links?.next) {
            const url = new URL(response.links.next);
            nextCursor = url.searchParams.get("page[cursor]") || undefined;
        }

        return {
            success: true,
            data: {
                lists: response.data.map((l) => ({
                    id: l.id,
                    ...l.attributes
                })),
                nextCursor,
                hasMore: !!response.links?.next
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
