import { FastifyPluginAsync } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { EmbeddingService } from "../../../services/embeddings/EmbeddingService";
import { ChatInterfaceMessageChunkRepository } from "../../../storage/repositories/ChatInterfaceMessageChunkRepository";
import { ChatInterfaceSessionRepository } from "../../../storage/repositories/ChatInterfaceSessionRepository";

const logger = createServiceLogger("ChatInterfaceQueryRoutes");
const sessionRepo = new ChatInterfaceSessionRepository();
const chunkRepo = new ChatInterfaceMessageChunkRepository();

interface QueryRequestBody {
    sessionToken: string;
    query: string;
    topK?: number;
    similarityThreshold?: number;
}

interface QueryResult {
    content: string;
    sourceName: string | null;
    sourceType: "file" | "url";
    chunkIndex: number;
    similarity: number;
}

export const publicChatInterfaceQueryRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * POST /api/public/chat-interfaces/:slug/query
     * Query uploaded attachments using vector similarity search
     */
    fastify.post<{
        Params: { slug: string };
        Body: QueryRequestBody;
    }>("/:slug/query", async (request, reply) => {
        const { slug } = request.params;
        const { sessionToken, query, topK = 5, similarityThreshold = 0.7 } = request.body;

        // 1. Validate request
        if (!sessionToken) {
            return reply.status(400).send({ error: "Session token is required" });
        }

        if (!query || query.trim() === "") {
            return reply.status(400).send({ error: "Query is required" });
        }

        try {
            // 2. Validate session
            const session = await sessionRepo.findBySlugAndToken(slug, sessionToken);
            if (!session) {
                return reply.status(404).send({ error: "Session not found" });
            }

            // 3. Check if session has any chunks
            const chunkCount = await chunkRepo.countBySessionId(session.id);
            if (chunkCount === 0) {
                return reply.send({
                    success: true,
                    data: {
                        results: [],
                        message: "No documents have been uploaded to this session yet"
                    }
                });
            }

            // 4. Generate embedding for the query
            let queryEmbedding: number[];
            try {
                const embeddingService = new EmbeddingService();
                const embeddingResult = await embeddingService.generateEmbeddings([query], {
                    model: "text-embedding-3-small",
                    provider: "openai"
                });
                queryEmbedding = embeddingResult.embeddings[0];
            } catch (embeddingError) {
                logger.error({ slug, error: embeddingError }, "Failed to generate query embedding");
                return reply.status(503).send({
                    success: false,
                    error: "Unable to process query. Please try again later."
                });
            }

            // 5. Search for similar chunks
            let searchResults;
            try {
                searchResults = await chunkRepo.searchSimilar({
                    sessionId: session.id,
                    queryEmbedding,
                    topK,
                    similarityThreshold
                });
            } catch (searchError) {
                logger.error({ slug, error: searchError }, "Failed to search chunks");
                return reply.status(500).send({
                    success: false,
                    error: "Failed to search documents. Please try again."
                });
            }

            // 6. Format results
            const results: QueryResult[] = searchResults.map((result) => ({
                content: result.content,
                sourceName: result.sourceName,
                sourceType: result.sourceType,
                chunkIndex: result.chunkIndex,
                similarity: result.similarity
            }));

            logger.info(
                {
                    sessionId: session.id,
                    query: query.substring(0, 100),
                    resultsCount: results.length
                },
                "Vector similarity search completed"
            );

            return reply.send({
                success: true,
                data: {
                    results,
                    totalChunks: chunkCount
                }
            });
        } catch (error) {
            logger.error({ slug, error }, "Error processing query");
            return reply.status(500).send({ error: "Failed to process query" });
        }
    });
};
