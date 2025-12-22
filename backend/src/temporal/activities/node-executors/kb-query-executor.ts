import type { JsonObject } from "@flowmaestro/shared";
import { EmbeddingService } from "../../../services/embeddings/EmbeddingService";
import { KnowledgeBaseRepository, KnowledgeChunkRepository } from "../../../storage/repositories";
import { ExecuteNodeInput } from "./index";

export interface KnowledgeBaseQueryNodeConfig {
    knowledgeBaseId: string;
    queryText: string; // Can include variable interpolation like {{input.query}}
    includeMetadata?: boolean; // Include chunk metadata in results (default: true)
}

/**
 * Execute Knowledge Base Query Node
 * Performs semantic similarity search on a knowledge base
 */
export async function executeKnowledgeBaseQueryNode(input: ExecuteNodeInput): Promise<JsonObject> {
    const config = input.nodeConfig as unknown as KnowledgeBaseQueryNodeConfig;
    const kbRepository = new KnowledgeBaseRepository();
    const chunkRepository = new KnowledgeChunkRepository();
    const embeddingService = new EmbeddingService();

    try {
        // Validate config
        if (!config.knowledgeBaseId) {
            throw new Error("Knowledge base ID is required");
        }

        if (!config.queryText) {
            throw new Error("Query text is required");
        }

        // TODO: Implement variable interpolation for query text
        // For now, use the query text directly
        const interpolatedQuery = config.queryText;

        if (!interpolatedQuery || interpolatedQuery.trim().length === 0) {
            throw new Error("Query text is empty");
        }

        // Get knowledge base
        const kb = await kbRepository.findById(config.knowledgeBaseId);
        if (!kb) {
            throw new Error(`Knowledge base not found: ${config.knowledgeBaseId}`);
        }

        // Generate embedding for the query
        const queryEmbedding = await embeddingService.generateQueryEmbedding(
            interpolatedQuery,
            {
                model: kb.config.embeddingModel,
                provider: kb.config.embeddingProvider,
                dimensions: kb.config.embeddingDimensions
            }
            // Note: userId would ideally be passed from the execution context
        );

        // Search for similar chunks
        const searchResults = await chunkRepository.searchSimilar({
            knowledge_base_id: config.knowledgeBaseId,
            query_embedding: queryEmbedding,
            top_k: 5,
            similarity_threshold: 0.7
        });

        // Format results
        const results = searchResults.map((result) => {
            const formattedResult: Record<string, unknown> = {
                content: result.content,
                similarity: result.similarity,
                documentName: result.document_name,
                chunkIndex: result.chunk_index
            };

            // Optionally include metadata
            if (config.includeMetadata !== false) {
                formattedResult.metadata = result.metadata;
            }

            return formattedResult;
        });

        // Get top result for convenience
        const topResult = results.length > 0 ? results[0] : null;

        // Combine all results into a single text for easy use in prompts
        const combinedText = results
            .map((r, index) => {
                const sourceInfo = r.documentName
                    ? `[Source: ${r.documentName}, Chunk ${r.chunkIndex}]`
                    : "";
                const similarity = typeof r.similarity === "number" ? r.similarity : 0;
                return `Result ${index + 1} (similarity: ${similarity.toFixed(3)}):\n${r.content}\n${sourceInfo}`;
            })
            .join("\n\n---\n\n");

        return {
            success: true,
            data: {
                query: interpolatedQuery,
                results,
                topResult,
                combinedText, // Easy to use in LLM prompts
                count: results.length,
                metadata: {
                    knowledgeBaseId: config.knowledgeBaseId,
                    knowledgeBaseName: kb.name
                }
            }
        } as unknown as JsonObject;
    } catch (error: unknown) {
        console.error("[KB Query Executor] Error:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Failed to query knowledge base";
        return {
            success: false,
            error: errorMessage
        } as unknown as JsonObject;
    }
}
