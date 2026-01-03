/**
 * Knowledge Base Query Node Execution
 *
 * Complete execution logic and handler for knowledge base query nodes.
 * Performs semantic similarity search on a knowledge base using embeddings.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { EmbeddingService } from "../../../../../services/embeddings/EmbeddingService";
import {
    KnowledgeBaseRepository,
    KnowledgeChunkRepository
} from "../../../../../storage/repositories";
import { createActivityLogger, getExecutionContext } from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const logger = createActivityLogger({ nodeType: "KnowledgeBaseQuery" });

// ============================================================================
// TYPES
// ============================================================================

export interface KnowledgeBaseQueryNodeConfig {
    knowledgeBaseId: string;
    queryText: string; // Can include variable interpolation like {{input.query}}
    includeMetadata?: boolean; // Include chunk metadata in results (default: true)
    outputVariable?: string;
}

export interface KnowledgeBaseQueryNodeResult {
    success: boolean;
    data?: {
        query: string;
        results: Array<{
            content: string;
            similarity: number;
            documentName?: string;
            chunkIndex?: number;
            metadata?: Record<string, unknown>;
        }>;
        topResult: {
            content: string;
            similarity: number;
            documentName?: string;
            chunkIndex?: number;
            metadata?: Record<string, unknown>;
        } | null;
        combinedText: string;
        count: number;
        metadata: {
            knowledgeBaseId: string;
            knowledgeBaseName: string;
        };
    };
    error?: string;
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Knowledge Base Query Node
 * Performs semantic similarity search on a knowledge base
 */
export async function executeKnowledgeBaseQueryNode(
    config: KnowledgeBaseQueryNodeConfig,
    _context: JsonObject
): Promise<JsonObject> {
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

        // Build typed results array
        const typedResults = results as Array<{
            content: string;
            similarity: number;
            documentName?: string;
            chunkIndex?: number;
            metadata?: Record<string, unknown>;
        }>;

        const typedTopResult = topResult as {
            content: string;
            similarity: number;
            documentName?: string;
            chunkIndex?: number;
            metadata?: Record<string, unknown>;
        } | null;

        const nodeResult: KnowledgeBaseQueryNodeResult = {
            success: true,
            data: {
                query: interpolatedQuery,
                results: typedResults,
                topResult: typedTopResult,
                combinedText, // Easy to use in LLM prompts
                count: results.length,
                metadata: {
                    knowledgeBaseId: config.knowledgeBaseId,
                    knowledgeBaseName: kb.name
                }
            }
        };

        if (config.outputVariable) {
            return { [config.outputVariable]: nodeResult } as unknown as JsonObject;
        }

        return nodeResult as unknown as JsonObject;
    } catch (error: unknown) {
        logger.error(
            "KB Query execution error",
            error instanceof Error ? error : new Error(String(error)),
            {
                knowledgeBaseId: config.knowledgeBaseId
            }
        );
        const errorMessage =
            error instanceof Error ? error.message : "Failed to query knowledge base";

        const errorResult: KnowledgeBaseQueryNodeResult = {
            success: false,
            error: errorMessage
        };

        if (config.outputVariable) {
            return { [config.outputVariable]: errorResult } as unknown as JsonObject;
        }

        return errorResult as unknown as JsonObject;
    }
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Knowledge Base Query node type.
 */
export class KnowledgeBaseQueryNodeHandler extends BaseNodeHandler {
    readonly name = "KnowledgeBaseQueryNodeHandler";
    readonly supportedNodeTypes = ["kbQuery", "knowledgeBaseQuery"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeKnowledgeBaseQueryNode(
            input.nodeConfig as unknown as KnowledgeBaseQueryNodeConfig,
            context
        );

        return this.success(
            result,
            {},
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

/**
 * Factory function for creating Knowledge Base Query handler.
 */
export function createKnowledgeBaseQueryNodeHandler(): KnowledgeBaseQueryNodeHandler {
    return new KnowledgeBaseQueryNodeHandler();
}
