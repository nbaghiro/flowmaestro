/**
 * Chunk Text Activity
 *
 * Chunks extracted text into smaller pieces for embedding and storage.
 */

import { createServiceLogger } from "../../../core/logging";
import {
    createStorageAdapter,
    type StorageAdapterConfig
} from "../../../services/document-processing";
import { TextChunker } from "../../../services/embeddings/TextChunker";
import { globalEventEmitter } from "../../../services/events/EventEmitter";
import { KnowledgeDocumentRepository } from "../../../storage/repositories/KnowledgeDocumentRepository";
import type { ChunkTextInput, ChunkResult } from "./types";

const logger = createServiceLogger("ChunkTextActivity");

/**
 * Sanitize text to remove invalid UTF-8 characters
 */
function sanitizeText(text: string): string {
    /* eslint-disable no-control-regex */
    return text
        .replace(/\x00/g, "")
        .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")
        .trim();
    /* eslint-enable no-control-regex */
}

/**
 * Build adapter config from input
 */
function buildAdapterConfig(input: ChunkTextInput): StorageAdapterConfig {
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
                sourceType: input.sourceType || "file",
                sourceName: input.sourceName || "unknown",
                sourceIndex: input.sourceIndex || 0
            };
        default:
            throw new Error(`Unknown storage target: ${input.storageTarget}`);
    }
}

/**
 * Chunk text into smaller pieces
 */
export async function chunkDocumentText(input: ChunkTextInput): Promise<ChunkResult[]> {
    logger.info(
        {
            storageTarget: input.storageTarget,
            documentId: input.documentId,
            submissionId: input.submissionId,
            sessionId: input.sessionId,
            contentLength: input.content.length
        },
        "Starting text chunking"
    );

    try {
        // Get chunk configuration from adapter
        const adapterConfig = buildAdapterConfig(input);
        const adapter = createStorageAdapter(adapterConfig);
        const chunkConfig = await adapter.getChunkConfig();

        const chunker = new TextChunker({
            chunkSize: chunkConfig.chunkSize,
            chunkOverlap: chunkConfig.chunkOverlap
        });

        // Build metadata based on storage target
        let metadata: Record<string, unknown> = {};

        if (input.storageTarget === "knowledge-base" && input.documentId) {
            const documentRepo = new KnowledgeDocumentRepository();
            const document = await documentRepo.findById(input.documentId);
            metadata = {
                document_id: input.documentId,
                document_name: document?.name,
                file_type: input.fileType
            };
        } else {
            metadata = {
                source_type: input.sourceType,
                source_name: input.sourceName,
                source_index: input.sourceIndex
            };

            if (input.submissionId) {
                metadata.submission_id = input.submissionId;
            }
            if (input.sessionId) {
                metadata.session_id = input.sessionId;
            }
        }

        // Chunk the text
        const chunks = chunker.chunkText(input.content, metadata);

        // Sanitize each chunk - cast metadata to JsonObject since it comes from document extraction
        const sanitizedChunks: ChunkResult[] = chunks.map((chunk) => ({
            content: sanitizeText(chunk.content),
            index: chunk.index,
            metadata: chunk.metadata as ChunkResult["metadata"]
        }));

        logger.info(
            {
                storageTarget: input.storageTarget,
                chunkCount: sanitizedChunks.length
            },
            "Text chunking completed"
        );

        return sanitizedChunks;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMsg }, "Text chunking failed");

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
