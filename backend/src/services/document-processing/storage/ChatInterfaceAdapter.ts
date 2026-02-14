/**
 * Chat Interface Storage Adapter
 *
 * Stores document chunks in chat_interface_message_chunks table.
 * Wraps ChatInterfaceMessageChunkRepository.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import {
    ChatInterfaceMessageChunkRepository,
    type CreateChunkInput as CreateChatChunkInput
} from "../../../storage/repositories/ChatInterfaceMessageChunkRepository";
import type {
    ChunkStorageAdapter,
    CreateChunkInput,
    StoreChunksResult,
    ChunkConfig,
    EmbeddingConfig
} from "./ChunkStorageAdapter";

const logger = createServiceLogger("ChatInterfaceAdapter");

export interface ChatInterfaceAdapterConfig {
    sessionId: string;
    threadId?: string;
    sourceType: "file" | "url";
    sourceName: string;
    sourceIndex: number;
}

export class ChatInterfaceAdapter implements ChunkStorageAdapter {
    readonly storageTarget = "chat-interface" as const;

    private config: ChatInterfaceAdapterConfig;
    private chunkRepo: ChatInterfaceMessageChunkRepository;

    constructor(config: ChatInterfaceAdapterConfig) {
        this.config = config;
        this.chunkRepo = new ChatInterfaceMessageChunkRepository();
    }

    async getChunkConfig(): Promise<ChunkConfig> {
        // Chat interfaces use fixed chunk settings
        return {
            chunkSize: 1000,
            chunkOverlap: 200
        };
    }

    async getEmbeddingConfig(): Promise<EmbeddingConfig> {
        // Chat interfaces use default OpenAI embeddings
        return {
            model: "text-embedding-3-small",
            provider: "openai"
        };
    }

    async storeChunks(chunks: CreateChunkInput[]): Promise<StoreChunksResult> {
        logger.info(
            {
                sessionId: this.config.sessionId,
                sourceName: this.config.sourceName,
                chunkCount: chunks.length
            },
            "Storing chat interface chunks"
        );

        const chunkInputs: CreateChatChunkInput[] = chunks.map((chunk) => ({
            sessionId: this.config.sessionId,
            threadId: this.config.threadId,
            sourceType: this.config.sourceType,
            sourceName: this.config.sourceName,
            sourceIndex: this.config.sourceIndex,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            embedding: chunk.embedding,
            metadata: chunk.metadata as JsonObject
        }));

        const createdChunks = await this.chunkRepo.createChunks(chunkInputs);

        logger.info(
            {
                sessionId: this.config.sessionId,
                sourceName: this.config.sourceName,
                storedCount: createdChunks.length
            },
            "Chat interface chunks stored"
        );

        return {
            chunkCount: createdChunks.length,
            totalTokens: chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0)
        };
    }

    async completeProcessing(): Promise<void> {
        // Chat interface has no explicit completion status to update
        // The chunks are immediately available for RAG
        logger.info({ sessionId: this.config.sessionId }, "Chat interface processing completed");
    }

    async failProcessing(error: string): Promise<void> {
        // Chat interface has no explicit failure status to update
        // Just log the error
        logger.error(
            { sessionId: this.config.sessionId, error },
            "Chat interface processing failed"
        );
    }

    async getChunkCount(): Promise<number> {
        return await this.chunkRepo.countBySessionId(this.config.sessionId);
    }
}
