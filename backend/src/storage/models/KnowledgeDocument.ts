import type { JsonValue } from "@flowmaestro/shared";

export type DocumentSourceType = "file" | "url" | "integration";

export type DocumentFileType = "pdf" | "docx" | "doc" | "txt" | "md" | "html" | "json" | "csv";

export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export interface DocumentMetadata extends Record<string, JsonValue | undefined> {
    // Standard metadata
    author?: string;
    created_date?: string;
    pages?: number;
    language?: string;
    file_size?: number;
    word_count?: number;
    // Integration source metadata (when source_type = "integration")
    integration_source_id?: string;
    integration_connection_id?: string;
    integration_provider?: string;
    integration_file_id?: string;
    integration_file_path?: string;
    integration_last_modified?: string;
    integration_content_hash?: string;
}

export interface KnowledgeDocumentModel {
    id: string;
    knowledge_base_id: string;
    name: string;
    source_type: DocumentSourceType;
    source_url: string | null;
    file_path: string | null;
    file_type: DocumentFileType;
    file_size: bigint | null;
    content: string | null;
    metadata: DocumentMetadata;
    status: DocumentStatus;
    error_message: string | null;
    processing_started_at: Date | null;
    processing_completed_at: Date | null;
    created_at: Date;
    updated_at: Date;
    /** Reference to integration source if imported from provider */
    source_id: string | null;
}

export interface CreateKnowledgeDocumentInput {
    knowledge_base_id: string;
    name: string;
    source_type: DocumentSourceType;
    source_url?: string;
    file_path?: string;
    file_type: DocumentFileType;
    file_size?: bigint;
    metadata?: DocumentMetadata;
    /** Reference to integration source if imported from provider */
    source_id?: string;
}

export interface UpdateKnowledgeDocumentInput {
    name?: string;
    content?: string;
    metadata?: DocumentMetadata;
    status?: DocumentStatus;
    error_message?: string;
    processing_started_at?: Date;
    processing_completed_at?: Date;
    file_size?: number;
}
