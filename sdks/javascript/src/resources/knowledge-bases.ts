/**
 * Knowledge Bases Resource
 */

import type { HttpClient } from "../http/base-client";
import type {
    KnowledgeBase,
    PaginationParams,
    PaginatedResponse,
    ApiResponse,
    QueryKnowledgeBaseOptions,
    QueryKnowledgeBaseResponse
} from "../types";

export class KnowledgeBases {
    constructor(private readonly http: HttpClient) {}

    /**
     * List all knowledge bases
     *
     * @param options - Pagination options
     * @returns Paginated list of knowledge bases
     *
     * @example
     * ```typescript
     * const { data: kbs } = await client.knowledgeBases.list();
     * for (const kb of kbs) {
     *     console.log(`- ${kb.name}`);
     *     console.log(`  Documents: ${kb.document_count}`);
     *     console.log(`  Chunks: ${kb.chunk_count}`);
     * }
     * ```
     */
    async list(options: PaginationParams = {}): Promise<PaginatedResponse<KnowledgeBase>> {
        return this.http.getPaginated<KnowledgeBase>("/api/v1/knowledge-bases", {
            page: options.page,
            per_page: options.per_page
        });
    }

    /**
     * Get a knowledge base by ID
     *
     * @param id - Knowledge base ID
     * @returns Knowledge base details
     *
     * @example
     * ```typescript
     * const { data: kb } = await client.knowledgeBases.get("kb_123");
     * console.log(`Knowledge Base: ${kb.name}`);
     * console.log(`Embedding Model: ${kb.embedding_model}`);
     * ```
     */
    async get(id: string): Promise<ApiResponse<KnowledgeBase>> {
        return this.http.get<KnowledgeBase>(`/api/v1/knowledge-bases/${id}`);
    }

    /**
     * Query a knowledge base with semantic search
     *
     * @param id - Knowledge base ID
     * @param options - Query options
     * @returns Search results with similarity scores
     *
     * @example
     * ```typescript
     * const { data } = await client.knowledgeBases.query("kb_123", {
     *     query: "How do I reset my password?",
     *     top_k: 5
     * });
     *
     * console.log(`Found ${data.results.length} relevant chunks:`);
     * for (const result of data.results) {
     *     console.log(`\n[Score: ${result.similarity.toFixed(3)}]`);
     *     console.log(result.content);
     * }
     * ```
     */
    async query(
        id: string,
        options: QueryKnowledgeBaseOptions
    ): Promise<ApiResponse<QueryKnowledgeBaseResponse>> {
        return this.http.post<QueryKnowledgeBaseResponse>(`/api/v1/knowledge-bases/${id}/query`, {
            query: options.query,
            top_k: options.top_k
        });
    }
}
