/**
 * Chunk Storage Adapter Interface
 *
 * Defines the common interface for storing document chunks across different storage targets:
 * - Knowledge Base (knowledge_document_chunks)
 * - Form Submission (form_interface_submission_chunks)
 * - Chat Interface (chat_interface_message_chunks)
 */

import type { ChunkConfig, EmbeddingConfig, JsonObject } from "@flowmaestro/shared";

export type { ChunkConfig, EmbeddingConfig };

/**
 * Input for creating a chunk with embedding
 */
export interface CreateChunkInput {
    content: string;
    chunkIndex: number;
    embedding: number[];
    tokenCount?: number;
    metadata?: JsonObject;
}

/**
 * Result from storing chunks
 */
export interface StoreChunksResult {
    chunkCount: number;
    totalTokens: number;
}

/**
 * Abstract interface for chunk storage adapters
 *
 * Each adapter implementation wraps a specific chunk repository
 * and handles the target-specific storage logic.
 */
export interface ChunkStorageAdapter {
    /**
     * Get the storage target type
     */
    readonly storageTarget: "knowledge-base" | "form-submission" | "chat-interface";

    /**
     * Get chunk configuration (size, overlap)
     * Different targets may have different default settings
     */
    getChunkConfig(): Promise<ChunkConfig>;

    /**
     * Get embedding configuration
     * Different targets may use different embedding models
     */
    getEmbeddingConfig(): Promise<EmbeddingConfig>;

    /**
     * Store chunks with embeddings
     */
    storeChunks(chunks: CreateChunkInput[]): Promise<StoreChunksResult>;

    /**
     * Mark processing as complete
     */
    completeProcessing(): Promise<void>;

    /**
     * Mark processing as failed
     */
    failProcessing(error: string): Promise<void>;

    /**
     * Get the count of stored chunks
     */
    getChunkCount(): Promise<number>;
}

/**
 * Storage target types
 */
export type StorageTarget = "knowledge-base" | "form-submission" | "chat-interface";
