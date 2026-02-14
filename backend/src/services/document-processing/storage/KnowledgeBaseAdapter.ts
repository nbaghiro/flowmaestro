/**
 * Knowledge Base Storage Adapter
 *
 * Stores document chunks in knowledge_document_chunks table.
 * Wraps KnowledgeChunkRepository and KnowledgeBaseRepository.
 */

import type { JsonValue } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { KnowledgeBaseRepository } from "../../../storage/repositories/KnowledgeBaseRepository";
import { KnowledgeChunkRepository } from "../../../storage/repositories/KnowledgeChunkRepository";
import { KnowledgeDocumentRepository } from "../../../storage/repositories/KnowledgeDocumentRepository";
import { globalEventEmitter } from "../../events/EventEmitter";
import type {
    ChunkStorageAdapter,
    CreateChunkInput,
    StoreChunksResult,
    ChunkConfig,
    EmbeddingConfig
} from "./ChunkStorageAdapter";

const logger = createServiceLogger("KnowledgeBaseAdapter");

export interface KnowledgeBaseAdapterConfig {
    documentId: string;
    knowledgeBaseId: string;
}

export class KnowledgeBaseAdapter implements ChunkStorageAdapter {
    readonly storageTarget = "knowledge-base" as const;

    private config: KnowledgeBaseAdapterConfig;
    private chunkRepo: KnowledgeChunkRepository;
    private documentRepo: KnowledgeDocumentRepository;
    private kbRepo: KnowledgeBaseRepository;

    constructor(config: KnowledgeBaseAdapterConfig) {
        this.config = config;
        this.chunkRepo = new KnowledgeChunkRepository();
        this.documentRepo = new KnowledgeDocumentRepository();
        this.kbRepo = new KnowledgeBaseRepository();
    }

    async getChunkConfig(): Promise<ChunkConfig> {
        const kb = await this.kbRepo.findById(this.config.knowledgeBaseId);
        if (!kb) {
            throw new Error(`Knowledge base ${this.config.knowledgeBaseId} not found`);
        }

        return {
            chunkSize: kb.config.chunkSize,
            chunkOverlap: kb.config.chunkOverlap
        };
    }

    async getEmbeddingConfig(): Promise<EmbeddingConfig> {
        const kb = await this.kbRepo.findById(this.config.knowledgeBaseId);
        if (!kb) {
            throw new Error(`Knowledge base ${this.config.knowledgeBaseId} not found`);
        }

        return {
            model: kb.config.embeddingModel,
            provider: kb.config.embeddingProvider,
            dimensions: kb.config.embeddingDimensions
        };
    }

    async storeChunks(chunks: CreateChunkInput[]): Promise<StoreChunksResult> {
        logger.info(
            { documentId: this.config.documentId, chunkCount: chunks.length },
            "Storing knowledge base chunks"
        );

        const chunkInputs = chunks.map((chunk) => ({
            document_id: this.config.documentId,
            knowledge_base_id: this.config.knowledgeBaseId,
            chunk_index: chunk.chunkIndex,
            content: chunk.content,
            embedding: chunk.embedding,
            token_count: chunk.tokenCount,
            metadata: chunk.metadata as Record<string, JsonValue | undefined>
        }));

        const createdChunks = await this.chunkRepo.batchInsert(chunkInputs);

        logger.info(
            { documentId: this.config.documentId, storedCount: createdChunks.length },
            "Knowledge base chunks stored"
        );

        return {
            chunkCount: createdChunks.length,
            totalTokens: chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0)
        };
    }

    async completeProcessing(): Promise<void> {
        logger.info({ documentId: this.config.documentId }, "Completing document processing");

        await this.documentRepo.updateStatus(this.config.documentId, "ready");

        const chunkCount = await this.getChunkCount();

        globalEventEmitter.emitDocumentCompleted(
            this.config.knowledgeBaseId,
            this.config.documentId,
            chunkCount
        );
    }

    async failProcessing(error: string): Promise<void> {
        logger.error({ documentId: this.config.documentId, error }, "Document processing failed");

        await this.documentRepo.updateStatus(this.config.documentId, "failed", error);

        globalEventEmitter.emitDocumentFailed(
            this.config.knowledgeBaseId,
            this.config.documentId,
            error
        );
    }

    async getChunkCount(): Promise<number> {
        const chunks = await this.chunkRepo.findByDocumentId(this.config.documentId);
        return chunks.length;
    }
}
