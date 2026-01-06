import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { EmbeddingService } from "../../../../services/embeddings/EmbeddingService";
import { KnowledgeBaseRepository } from "../../../../storage/repositories/KnowledgeBaseRepository";
import { KnowledgeChunkRepository } from "../../../../storage/repositories/KnowledgeChunkRepository";
import { requireScopes } from "../../../middleware/scope-checker";
import {
    sendSuccess,
    sendPaginated,
    sendNotFound,
    sendError,
    parsePaginationQuery
} from "../response-helpers";

const logger = createServiceLogger("PublicApiKnowledgeBases");

/**
 * Public API v1 - Knowledge Bases routes.
 */
export async function knowledgeBasesV1Routes(fastify: FastifyInstance): Promise<void> {
    // GET /api/v1/knowledge-bases - List knowledge bases
    fastify.get(
        "/",
        {
            preHandler: [requireScopes("knowledge-bases:read")]
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const { page, per_page, offset } = parsePaginationQuery(
                request.query as Record<string, unknown>
            );

            const kbRepo = new KnowledgeBaseRepository();
            const { knowledgeBases, total } = await kbRepo.findByUserId(userId, {
                limit: per_page,
                offset
            });

            // Get stats for each knowledge base
            const publicKbs = await Promise.all(
                knowledgeBases.map(async (kb) => {
                    const stats = await kbRepo.getStats(kb.id);
                    return {
                        id: kb.id,
                        name: kb.name,
                        description: kb.description,
                        document_count: stats?.document_count || 0,
                        chunk_count: stats?.chunk_count || 0,
                        created_at: kb.created_at.toISOString(),
                        updated_at: kb.updated_at.toISOString()
                    };
                })
            );

            return sendPaginated(reply, publicKbs, {
                page,
                per_page,
                total_count: total
            });
        }
    );

    // GET /api/v1/knowledge-bases/:id - Get knowledge base by ID
    fastify.get<{ Params: { id: string } }>(
        "/:id",
        {
            preHandler: [requireScopes("knowledge-bases:read")]
        },
        async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const kbId = request.params.id;

            const kbRepo = new KnowledgeBaseRepository();
            const kb = await kbRepo.findById(kbId);

            if (!kb || kb.user_id !== userId) {
                return sendNotFound(reply, "Knowledge Base", kbId);
            }

            const stats = await kbRepo.getStats(kbId);

            return sendSuccess(reply, {
                id: kb.id,
                name: kb.name,
                description: kb.description,
                embedding_model: kb.config.embeddingModel,
                chunk_size: kb.config.chunkSize,
                chunk_overlap: kb.config.chunkOverlap,
                document_count: stats?.document_count || 0,
                chunk_count: stats?.chunk_count || 0,
                created_at: kb.created_at.toISOString(),
                updated_at: kb.updated_at.toISOString()
            });
        }
    );

    // POST /api/v1/knowledge-bases/:id/query - Semantic search
    fastify.post<{ Params: { id: string }; Body: { query: string; top_k?: number } }>(
        "/:id/query",
        {
            preHandler: [requireScopes("knowledge-bases:read", "knowledge-bases:query")]
        },
        async (
            request: FastifyRequest<{
                Params: { id: string };
                Body: { query: string; top_k?: number };
            }>,
            reply: FastifyReply
        ) => {
            const userId = request.apiKeyUserId!;
            const kbId = request.params.id;
            const { query, top_k = 5 } = request.body || {};

            if (!query || typeof query !== "string") {
                return sendError(reply, 400, "validation_error", "Query is required");
            }

            const kbRepo = new KnowledgeBaseRepository();
            const kb = await kbRepo.findById(kbId);

            if (!kb || kb.user_id !== userId) {
                return sendNotFound(reply, "Knowledge Base", kbId);
            }

            try {
                // Generate embedding for query
                const embeddingService = new EmbeddingService();
                const embeddingResult = await embeddingService.generateEmbeddings(
                    [query],
                    {
                        model: kb.config.embeddingModel,
                        provider: kb.config.embeddingProvider,
                        dimensions: kb.config.embeddingDimensions
                    },
                    userId
                );

                if (embeddingResult.embeddings.length === 0) {
                    return sendError(
                        reply,
                        500,
                        "internal_error",
                        "Failed to generate query embedding"
                    );
                }

                const queryEmbedding = embeddingResult.embeddings[0];

                // Perform semantic search
                const chunkRepo = new KnowledgeChunkRepository();
                const results = await chunkRepo.searchSimilar({
                    knowledge_base_id: kbId,
                    query_embedding: queryEmbedding,
                    top_k: Math.min(top_k, 20),
                    similarity_threshold: 0.0
                });

                const publicResults = results.map((r) => ({
                    id: r.id,
                    content: r.content,
                    document_id: r.document_id,
                    document_name: r.document_name,
                    score: r.similarity,
                    metadata: r.metadata
                }));

                logger.info(
                    { kbId, userId, resultCount: results.length },
                    "Knowledge base query executed"
                );

                return sendSuccess(reply, {
                    results: publicResults,
                    query,
                    top_k: Math.min(top_k, 20)
                });
            } catch (error: unknown) {
                const errorMsg =
                    error instanceof Error ? error.message : "Knowledge base query failed";
                logger.error({ error, kbId, userId }, "Knowledge base query failed");
                return sendError(reply, 500, "internal_error", errorMsg);
            }
        }
    );
}
