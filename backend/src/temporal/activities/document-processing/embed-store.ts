/**
 * Embed and Store Activity
 *
 * Generates embeddings for chunks and stores them in the appropriate storage target.
 */

import { createServiceLogger } from "../../../core/logging";
import {
    createStorageAdapter,
    type StorageAdapterConfig
} from "../../../services/document-processing";
import { EmbeddingService } from "../../../services/embeddings/EmbeddingService";
import { globalEventEmitter } from "../../../services/events/EventEmitter";
import { KnowledgeDocumentRepository } from "../../../storage/repositories/KnowledgeDocumentRepository";
import type { EmbedAndStoreInput, EmbedAndStoreResult } from "./types";

const logger = createServiceLogger("EmbedAndStoreActivity");

/**
 * Build adapter config from input
 */
function buildAdapterConfig(input: EmbedAndStoreInput): StorageAdapterConfig {
    switch (input.storageTarget) {
        case "knowledge-base":
            return {
                storageTarget: "knowledge-base",
                documentId: input.documentId!,
                knowledgeBaseId: input.knowledgeBaseId!
            };
        case "form-submission":
            return {
                storageTarget: "form-submission",
                submissionId: input.submissionId!,
                sourceType: input.sourceType || "file",
                sourceName: input.sourceName || "unknown",
                sourceIndex: input.sourceIndex || 0
            };
        case "chat-interface":
            return {
                storageTarget: "chat-interface",
                sessionId: input.sessionId!,
                threadId: input.threadId,
                sourceType: input.sourceType || "file",
                sourceName: input.sourceName || "unknown",
                sourceIndex: input.sourceIndex || 0
            };
        default:
            throw new Error(`Unknown storage target: ${input.storageTarget}`);
    }
}

/**
 * Generate embeddings and store chunks
 */
export async function generateAndStoreChunks(
    input: EmbedAndStoreInput
): Promise<EmbedAndStoreResult> {
    logger.info(
        {
            storageTarget: input.storageTarget,
            documentId: input.documentId,
            submissionId: input.submissionId,
            sessionId: input.sessionId,
            chunkCount: input.chunks.length
        },
        "Starting embedding generation and storage"
    );

    try {
        // Get adapter and embedding configuration
        const adapterConfig = buildAdapterConfig(input);
        const adapter = createStorageAdapter(adapterConfig);
        const embeddingConfig = await adapter.getEmbeddingConfig();

        // Extract text from chunks
        const texts = input.chunks.map((chunk) => chunk.content);

        // Generate embeddings
        const embeddingService = new EmbeddingService();
        const embeddingResult = await embeddingService.generateEmbeddings(
            texts,
            {
                model: embeddingConfig.model,
                provider: embeddingConfig.provider,
                dimensions: embeddingConfig.dimensions
            },
            input.userId
        );

        logger.info(
            {
                storageTarget: input.storageTarget,
                embeddingCount: embeddingResult.embeddings.length,
                tokensUsed: embeddingResult.usage.total_tokens
            },
            "Embeddings generated"
        );

        // Prepare chunks with embeddings
        const chunksWithEmbeddings = input.chunks.map((chunk, index) => ({
            content: chunk.content,
            chunkIndex: chunk.index,
            embedding: embeddingResult.embeddings[index],
            tokenCount: embeddingService.estimateTokens(chunk.content),
            metadata: chunk.metadata
        }));

        // Store chunks using adapter
        const storeResult = await adapter.storeChunks(chunksWithEmbeddings);

        logger.info(
            {
                storageTarget: input.storageTarget,
                storedCount: storeResult.chunkCount,
                totalTokens: embeddingResult.usage.total_tokens
            },
            "Chunks stored successfully"
        );

        return {
            chunkCount: storeResult.chunkCount,
            totalTokens: embeddingResult.usage.total_tokens
        };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMsg }, "Embedding and storage failed");

        // For knowledge base, update status and emit failure event
        if (input.storageTarget === "knowledge-base" && input.documentId) {
            const documentRepo = new KnowledgeDocumentRepository();
            await documentRepo.updateStatus(input.documentId, "failed", errorMsg);
            globalEventEmitter.emitDocumentFailed(
                input.knowledgeBaseId!,
                input.documentId,
                errorMsg
            );
        }

        throw error;
    }
}
