/**
 * Document Processing Activity Types
 *
 * Shared types for unified document processing activities.
 */

import type { JsonObject } from "@flowmaestro/shared";
import type { StorageTarget } from "../../../services/document-processing";
import type { DocumentFileType } from "../../../storage/models/KnowledgeDocument";

/**
 * Document source specification
 */
export interface DocumentSource {
    type: "file" | "url";
    filePath?: string;
    gcsPath?: string;
    mimeType?: string;
    url?: string;
    filename?: string;
}

/**
 * Storage target configuration for knowledge base
 */
export interface KnowledgeBaseTarget {
    storageTarget: "knowledge-base";
    documentId: string;
    knowledgeBaseId: string;
}

/**
 * Storage target configuration for form submission
 */
export interface FormSubmissionTarget {
    storageTarget: "form-submission";
    submissionId: string;
    sourceType: "file" | "url";
    sourceName: string;
    sourceIndex: number;
}

/**
 * Storage target configuration for chat interface
 */
export interface ChatInterfaceTarget {
    storageTarget: "chat-interface";
    sessionId: string;
    threadId?: string;
    sourceType: "file" | "url";
    sourceName: string;
    sourceIndex: number;
}

/**
 * Union of all storage target configurations
 */
export type StorageTargetConfig = KnowledgeBaseTarget | FormSubmissionTarget | ChatInterfaceTarget;

/**
 * Base input for all document processing activities
 */
export interface DocumentProcessingInput {
    storageTarget: StorageTarget;
    userId?: string;
}

/**
 * Input for text extraction activity
 */
export interface ExtractTextInput extends DocumentProcessingInput {
    // Knowledge base fields
    documentId?: string;
    knowledgeBaseId?: string;
    filePath?: string;
    sourceUrl?: string;
    fileType?: DocumentFileType;

    // Form/Chat fields
    submissionId?: string;
    sessionId?: string;
    threadId?: string;
    gcsPath?: string;
    mimeType?: string;
    url?: string;
    sourceName?: string;
    sourceIndex?: number;
    sourceType?: "file" | "url";
}

/**
 * Result from text chunking
 */
export interface ChunkResult {
    content: string;
    index: number;
    metadata: JsonObject;
}

/**
 * Input for text chunking activity
 */
export interface ChunkTextInput extends DocumentProcessingInput {
    content: string;
    // Knowledge base fields
    documentId?: string;
    knowledgeBaseId?: string;
    fileType?: DocumentFileType;
    // Form/Chat fields
    submissionId?: string;
    sessionId?: string;
    sourceName?: string;
    sourceIndex?: number;
    sourceType?: "file" | "url";
}

/**
 * Input for embedding and storage activity
 */
export interface EmbedAndStoreInput extends DocumentProcessingInput {
    chunks: ChunkResult[];
    // Knowledge base fields
    documentId?: string;
    knowledgeBaseId?: string;
    // Form/Chat fields
    submissionId?: string;
    sessionId?: string;
    threadId?: string;
    sourceName?: string;
    sourceIndex?: number;
    sourceType?: "file" | "url";
}

/**
 * Result from embedding and storage activity
 */
export interface EmbedAndStoreResult {
    chunkCount: number;
    totalTokens: number;
}

/**
 * Input for completion activity
 */
export interface CompleteProcessingInput extends DocumentProcessingInput {
    success: boolean;
    // Knowledge base fields
    documentId?: string;
    knowledgeBaseId?: string;
    // Form/Chat fields
    submissionId?: string;
    sessionId?: string;
}
