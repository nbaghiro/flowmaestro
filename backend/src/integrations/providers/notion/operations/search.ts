import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { NotionClient } from "../client/NotionClient";

/**
 * Search input schema
 */
export const searchSchema = z.object({
    query: z.string().optional().describe("Search query string"),
    filter: z
        .object({
            value: z.enum(["page", "database"]),
            property: z.literal("object")
        })
        .optional()
        .describe("Filter by object type (page or database)"),
    page_size: z.number().min(1).max(100).optional().describe("Number of results per page")
});

export type SearchParams = z.infer<typeof searchSchema>;

/**
 * Search operation definition
 */
export const searchOperation: OperationDefinition = {
    id: "search",
    name: "Search",
    description: "Search for pages and databases in Notion workspace",
    category: "query",
    retryable: true,
    inputSchema: searchSchema
};

/**
 * Execute search operation
 */
export async function executeSearch(
    client: NotionClient,
    params: SearchParams
): Promise<OperationResult> {
    try {
        const response = await client.search({
            query: params.query,
            filter: params.filter,
            page_size: params.page_size
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search Notion",
                retryable: true
            }
        };
    }
}
