export interface KnowledgeBaseConfig {
    embeddingModel: string; // e.g., "text-embedding-3-small"
    embeddingProvider: string; // e.g., "openai"
    chunkSize: number; // Default: 1000
    chunkOverlap: number; // Default: 200
    embeddingDimensions: number; // e.g., 1536 for text-embedding-3-small
}

export interface KnowledgeBaseModel {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    description: string | null;
    category: string | null;
    config: KnowledgeBaseConfig;
    created_at: Date;
    updated_at: Date;
}

export interface CreateKnowledgeBaseInput {
    user_id: string;
    workspace_id: string;
    name: string;
    description?: string;
    category?: string;
    config?: Partial<KnowledgeBaseConfig>; // Allow partial config, will use defaults
}

export interface UpdateKnowledgeBaseInput {
    name?: string;
    description?: string;
    config?: Partial<KnowledgeBaseConfig>;
}

export interface KnowledgeBaseStats {
    id: string;
    name: string;
    document_count: number;
    chunk_count: number;
    total_size_bytes: number;
    last_updated: Date;
}
