/**
 * Types for embedding capability
 */

import type {
    AIProvider,
    EmbeddingTaskType,
    TruncationStrategy,
    ResponseMetadata
} from "../../types";

/**
 * Embedding request
 */
export interface EmbeddingRequest {
    /** Provider to use */
    provider?: AIProvider;
    /** Model to use */
    model: string;
    /** Input text(s) to embed */
    input: string | string[];
    /** Task type for optimization */
    taskType?: EmbeddingTaskType;
    /** Truncation strategy */
    truncate?: TruncationStrategy;
    /** Target dimensions (for models that support it) */
    dimensions?: number;
    /** Batch size for processing */
    batchSize?: number;
    /** Connection ID for multi-tenant auth */
    connectionId?: string;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
    /** Generated embeddings */
    embeddings: number[][];
    /** Dimensions of each embedding */
    dimensions: number;
    /** Response metadata */
    metadata: ResponseMetadata & {
        inputCount: number;
    };
}
