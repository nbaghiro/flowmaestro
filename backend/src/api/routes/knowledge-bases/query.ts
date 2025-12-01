import { FastifyInstance } from "fastify";
import { EmbeddingService } from "../../../services/embeddings/EmbeddingService";
import { KnowledgeBaseRepository, KnowledgeChunkRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";

export async function queryKnowledgeBaseRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/query",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const chunkRepository = new KnowledgeChunkRepository();
            const embeddingService = new EmbeddingService();

            const params = request.params as { id: string };
            const body = request.body as {
                query: string;
                top_k?: number;
                similarity_threshold?: number;
            };

            // Verify ownership
            const kb = await kbRepository.findById(params.id);
            if (!kb) {
                return reply.status(404).send({
                    success: false,
                    error: "Knowledge base not found"
                });
            }

            if (kb.user_id !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "Access denied"
                });
            }

            if (!body.query || body.query.trim().length === 0) {
                return reply.status(400).send({
                    success: false,
                    error: "Query text is required"
                });
            }

            try {
                // Generate embedding for the query
                const queryEmbedding = await embeddingService.generateQueryEmbedding(
                    body.query,
                    {
                        model: kb.config.embeddingModel,
                        provider: kb.config.embeddingProvider,
                        dimensions: kb.config.embeddingDimensions
                    },
                    request.user!.id
                );

                // Search for similar chunks
                // Default values: top_k=10, similarity_threshold=0.3
                const topK = Math.min(Math.max(body.top_k ?? 10, 1), 50); // Clamp between 1 and 50
                const similarityThreshold = Math.max(
                    Math.min(body.similarity_threshold ?? 0.3, 1.0),
                    0.0
                ); // Clamp between 0.0 and 1.0

                const results = await chunkRepository.searchSimilar({
                    knowledge_base_id: params.id,
                    query_embedding: queryEmbedding,
                    top_k: topK,
                    similarity_threshold: similarityThreshold
                });

                return reply.send({
                    success: true,
                    data: {
                        query: body.query,
                        results,
                        count: results.length,
                        top_k: topK,
                        similarity_threshold: similarityThreshold
                    }
                });
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                fastify.log.error(error, "Error querying knowledge base");
                return reply.status(500).send({
                    success: false,
                    error: `Failed to query knowledge base: ${errorMsg}`
                });
            }
        }
    );
}
