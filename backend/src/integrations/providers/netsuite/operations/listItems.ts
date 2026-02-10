import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listItemsSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of results to return (1-100)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    q: z.string().optional().describe("SuiteQL search query")
});

export type ListItemsParams = z.infer<typeof listItemsSchema>;

export const listItemsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listItems",
            name: "List Items",
            description: "List inventory items in NetSuite with pagination",
            category: "erp",
            actionType: "read",
            inputSchema: listItemsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "NetSuite", err: error }, "Failed to create listItemsOperation");
        throw new Error(
            `Failed to create listItems operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListItems(
    client: NetsuiteClient,
    params: ListItemsParams
): Promise<OperationResult> {
    try {
        const response = await client.listItems({
            limit: params.limit,
            offset: params.offset,
            q: params.q
        });

        return {
            success: true,
            data: {
                items: response.items,
                totalResults: response.totalResults,
                count: response.count,
                offset: response.offset,
                hasMore: response.hasMore
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list items",
                retryable: true
            }
        };
    }
}
