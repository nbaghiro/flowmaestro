import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { EmbeddingService } from "../../../services/embeddings/EmbeddingService";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { FormInterfaceSubmissionChunkRepository } from "../../../storage/repositories/FormInterfaceSubmissionChunkRepository";
import { FormInterfaceSubmissionRepository } from "../../../storage/repositories/FormInterfaceSubmissionRepository";
import { formInterfaceQueryRateLimiter } from "../../middleware/formInterfaceRateLimiter";

const logger = createServiceLogger("PublicFormInterfaceQuery");

export async function publicFormInterfaceQueryRoutes(fastify: FastifyInstance) {
    const formInterfaceRepo = new FormInterfaceRepository();
    const submissionRepo = new FormInterfaceSubmissionRepository();
    const chunkRepo = new FormInterfaceSubmissionChunkRepository();

    /**
     * POST /api/public/form-interfaces/:slug/submissions/:submissionId/query
     * Query submission attachments during execution (for RAG)
     * No auth required but validates submission belongs to form interface
     * Rate limited: 30 queries/min/IP to prevent embedding API abuse
     */
    fastify.post(
        "/:slug/submissions/:submissionId/query",
        {
            preHandler: [formInterfaceQueryRateLimiter]
        },
        async (request, reply) => {
            const { slug, submissionId } = request.params as {
                slug: string;
                submissionId: string;
            };
            const body = request.body as {
                query: string;
                topK?: number;
                similarityThreshold?: number;
            };

            try {
                // Find the form interface
                const formInterface = await formInterfaceRepo.findBySlug(slug);

                if (!formInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
                    });
                }

                // Find the submission
                const submission = await submissionRepo.findById(submissionId);

                if (!submission) {
                    return reply.status(404).send({
                        success: false,
                        error: "Submission not found"
                    });
                }

                // Validate submission belongs to this form interface
                if (submission.interfaceId !== formInterface.id) {
                    return reply.status(403).send({
                        success: false,
                        error: "Submission does not belong to this form interface"
                    });
                }

                // Validate query
                if (!body.query || body.query.trim() === "") {
                    return reply.status(400).send({
                        success: false,
                        error: "Query is required"
                    });
                }

                // Check if attachments have been processed
                if (submission.attachmentsStatus !== "ready") {
                    return reply.send({
                        success: true,
                        data: {
                            results: [],
                            message: "Attachments are still being processed"
                        }
                    });
                }

                // Generate query embedding
                const embeddingService = new EmbeddingService();
                let queryEmbedding: number[];

                try {
                    const embeddingResult = await embeddingService.generateEmbeddings(
                        [body.query],
                        {
                            model: "text-embedding-3-small",
                            provider: "openai"
                        }
                    );
                    queryEmbedding = embeddingResult.embeddings[0];
                } catch (embeddingError) {
                    logger.error(
                        { slug, submissionId, error: embeddingError },
                        "Failed to generate query embedding"
                    );
                    return reply.status(503).send({
                        success: false,
                        error: "Unable to process query. Please try again later."
                    });
                }

                // Search for similar chunks
                let searchResults;
                try {
                    searchResults = await chunkRepo.searchSimilar({
                        submissionId,
                        queryEmbedding,
                        topK: body.topK || 5,
                        similarityThreshold: body.similarityThreshold || 0.7
                    });
                } catch (searchError) {
                    logger.error(
                        { slug, submissionId, error: searchError },
                        "Failed to search chunks"
                    );
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to search documents. Please try again."
                    });
                }

                return reply.send({
                    success: true,
                    data: {
                        results: searchResults
                    }
                });
            } catch (error) {
                logger.error(
                    { slug, submissionId, error },
                    "Error querying form interface submission"
                );
                return reply.status(500).send({
                    success: false,
                    error: "Failed to query submission"
                });
            }
        }
    );
}
