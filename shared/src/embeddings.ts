// ============================================================================
// EMBEDDING TYPES
// ============================================================================

/**
 * Configuration for embedding generation.
 * Used across document processing and embedding services.
 */
export interface EmbeddingConfig {
    /** The embedding model to use (e.g., "text-embedding-3-small") */
    model: string;
    /** The provider (e.g., "openai", "cohere", "google") */
    provider: string;
    /** Optional: reduce embedding dimensions (provider-dependent) */
    dimensions?: number;
}

/**
 * Configuration for text chunking.
 * Defines how documents are split into chunks for embedding.
 */
export interface ChunkConfig {
    /** Maximum size of each chunk in characters */
    chunkSize: number;
    /** Number of characters to overlap between chunks */
    chunkOverlap: number;
}
