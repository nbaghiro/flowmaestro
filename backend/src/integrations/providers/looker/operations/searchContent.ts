import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LookerClient } from "../client/LookerClient";
import { LookerSearchTermSchema } from "./schemas";
import type { LookerSearchResult } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Search Content operation schema
 */
export const searchContentSchema = z.object({
    term: LookerSearchTermSchema,
    include_dashboards: z.boolean().default(true).describe("Include dashboards in search results"),
    include_looks: z.boolean().default(true).describe("Include looks in search results"),
    limit: z.number().int().min(1).max(100).default(50).describe("Maximum results to return")
});

export type SearchContentParams = z.infer<typeof searchContentSchema>;

/**
 * Search Content operation definition
 */
export const searchContentOperation: OperationDefinition = {
    id: "searchContent",
    name: "Search Content",
    description: "Search for dashboards and looks by title or description",
    category: "content",
    inputSchema: searchContentSchema,
    inputSchemaJSON: toJSONSchema(searchContentSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute search content operation
 */
export async function executeSearchContent(
    client: LookerClient,
    params: SearchContentParams
): Promise<OperationResult> {
    try {
        const results: LookerSearchResult = {};

        // Search dashboards if enabled
        if (params.include_dashboards) {
            const dashboards = await client.get<LookerSearchResult["dashboards"]>(
                "/search/dashboards",
                {
                    title: params.term,
                    limit: params.limit.toString()
                }
            );
            results.dashboards = dashboards;
        }

        // Search looks if enabled
        if (params.include_looks) {
            const looks = await client.get<LookerSearchResult["looks"]>("/search/looks", {
                title: params.term,
                limit: params.limit.toString()
            });
            results.looks = looks;
        }

        return {
            success: true,
            data: {
                term: params.term,
                dashboards: results.dashboards || [],
                looks: results.looks || [],
                dashboard_count: results.dashboards?.length || 0,
                look_count: results.looks?.length || 0
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search content",
                retryable: true
            }
        };
    }
}
