import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ElasticsearchClient } from "../client/ElasticsearchClient";

/**
 * Search operation schema
 */
export const searchSchema = z.object({
    index: z.string().min(1).describe("Index name to search"),
    query: z.record(z.unknown()).optional().describe("Elasticsearch Query DSL object"),
    size: z.number().optional().default(10).describe("Number of results to return"),
    from: z.number().optional().default(0).describe("Offset for pagination"),
    sort: z
        .array(z.record(z.unknown()))
        .optional()
        .describe('Sort specification (e.g., [{ "timestamp": "desc" }])'),
    _source: z
        .union([z.boolean(), z.array(z.string())])
        .optional()
        .describe("Fields to return in _source"),
    aggregations: z.record(z.unknown()).optional().describe("Aggregation queries"),
    highlight: z.record(z.unknown()).optional().describe("Highlight configuration")
});

export type SearchParams = z.infer<typeof searchSchema>;

/**
 * Search operation definition
 */
export const searchOperation: OperationDefinition = {
    id: "search",
    name: "Search Documents",
    description: "Search documents using Elasticsearch Query DSL",
    category: "database",
    inputSchema: searchSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute search operation
 */
export async function executeSearch(
    client: ElasticsearchClient,
    params: SearchParams
): Promise<OperationResult> {
    try {
        const response = await client.search(params.index, params.query, {
            size: params.size,
            from: params.from,
            sort: params.sort,
            _source: params._source,
            aggregations: params.aggregations,
            highlight: params.highlight
        });

        // Extract total count (handle both old and new format)
        const total =
            typeof response.hits.total === "number"
                ? response.hits.total
                : response.hits.total.value;

        return {
            success: true,
            data: {
                hits: response.hits.hits.map((hit) => ({
                    _id: hit._id,
                    _index: hit._index,
                    _score: hit._score,
                    ...hit._source,
                    ...(hit.highlight && { _highlight: hit.highlight })
                })),
                total,
                took: response.took,
                timedOut: response.timed_out,
                aggregations: response.aggregations
            }
        };
    } catch (error) {
        return mapError(error);
    }
}

/**
 * Map errors to OperationResult
 */
function mapError(error: unknown): OperationResult {
    const message = error instanceof Error ? error.message : "Search failed";
    const statusCode = (error as { statusCode?: number }).statusCode;

    let type: "validation" | "not_found" | "server_error" = "server_error";
    let retryable = false;

    if (statusCode === 404 || message.includes("index_not_found")) {
        type = "not_found";
    } else if (statusCode === 400 || message.includes("parsing_exception")) {
        type = "validation";
    } else if (statusCode === 503 || statusCode === 429) {
        retryable = true;
    }

    return {
        success: false,
        error: { type, message, retryable }
    };
}
