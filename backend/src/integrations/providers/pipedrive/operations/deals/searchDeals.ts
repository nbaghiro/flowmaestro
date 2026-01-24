import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveSearchResult, PipedriveDeal } from "../types";

/**
 * Search Deals Parameters
 */
export const searchDealsSchema = z.object({
    term: z.string().min(1).describe("Search term to match against deal titles and notes"),
    fields: z.enum(["title", "notes", "custom_fields"]).optional().describe("Fields to search in"),
    exact_match: z.boolean().optional().default(false).describe("Whether to match exact term only"),
    status: z.enum(["open", "won", "lost"]).optional().describe("Filter by deal status"),
    person_id: z.number().int().optional().describe("Filter by person ID"),
    org_id: z.number().int().optional().describe("Filter by organization ID"),
    start: z.number().int().min(0).optional().default(0).describe("Pagination start"),
    limit: z.number().int().min(1).max(500).optional().default(50).describe("Items per page")
});

export type SearchDealsParams = z.infer<typeof searchDealsSchema>;

/**
 * Operation Definition
 */
export const searchDealsOperation: OperationDefinition = {
    id: "searchDeals",
    name: "Search Deals",
    description: "Search deals by title, notes, or custom fields",
    category: "deals",
    inputSchema: searchDealsSchema,
    inputSchemaJSON: toJSONSchema(searchDealsSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Search Deals
 */
export async function executeSearchDeals(
    client: PipedriveClient,
    params: SearchDealsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            term: params.term,
            item_types: "deal",
            start: params.start,
            limit: params.limit
        };

        if (params.fields) {
            queryParams.fields = params.fields;
        }
        if (params.exact_match) {
            queryParams.exact_match = params.exact_match;
        }
        if (params.status) {
            queryParams.status = params.status;
        }
        if (params.person_id !== undefined) {
            queryParams.person_id = params.person_id;
        }
        if (params.org_id !== undefined) {
            queryParams.org_id = params.org_id;
        }

        const response = await client.get<PipedriveSearchResult<PipedriveDeal>>(
            "/deals/search",
            queryParams
        );

        const items = response.data?.items?.map((item) => item.item) || [];

        return {
            success: true,
            data: {
                deals: items,
                pagination: response.additional_data?.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search deals",
                retryable: true
            }
        };
    }
}
