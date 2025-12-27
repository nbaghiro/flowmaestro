/**
 * Document Processor Task
 *
 * Processes documents for knowledge bases.
 * Extracts text, chunks content, and generates embeddings.
 */

import { task, metadata } from "@trigger.dev/sdk/v3";
import { createServiceLogger } from "../../core/logging";
import { KnowledgeDocumentRepository } from "../../storage/repositories/KnowledgeDocumentRepository";

const logger = createServiceLogger("DocumentProcessor");

export interface DocumentProcessorPayload {
    documentId: string;
    knowledgeBaseId: string;
    filePath: string;
    fileType: string;
    userId: string;
    sourceUrl?: string;
}

export interface DocumentProcessorResult {
    success: boolean;
    documentId: string;
    chunks?: number;
    error?: string;
}

/**
 * Document Processor Task
 *
 * Processes documents uploaded to knowledge bases:
 * 1. Downloads file from GCS
 * 2. Extracts text based on file type
 * 3. Chunks text into smaller pieces
 * 4. Generates embeddings for each chunk
 * 5. Stores chunks in vector database
 */
export const documentProcessor = task({
    id: "document-processor",
    retry: { maxAttempts: 3 },
    run: async (payload: DocumentProcessorPayload): Promise<DocumentProcessorResult> => {
        const { documentId, knowledgeBaseId, filePath, fileType, sourceUrl } = payload;

        await metadata.set("documentId", documentId);
        await metadata.set("knowledgeBaseId", knowledgeBaseId);
        await metadata.set("filePath", filePath);
        await metadata.set("sourceUrl", sourceUrl || null);
        await metadata.set("status", "processing");

        const docRepo = new KnowledgeDocumentRepository();

        try {
            // Update document status to processing
            await docRepo.update(documentId, {
                status: "processing"
            });

            await metadata.set("status", "extracting");
            logger.info({ documentId, fileType }, "Starting document extraction");

            // TODO: Implement document extraction based on file type
            // This would include:
            // 1. Download from GCS
            // 2. Parse PDF/DOCX/TXT/etc
            // 3. Extract text content

            await metadata.set("status", "chunking");
            // TODO: Implement text chunking

            await metadata.set("status", "embedding");
            // TODO: Implement embedding generation

            await metadata.set("status", "storing");
            // TODO: Store chunks in vector database

            // Update document status to ready
            await docRepo.update(documentId, {
                status: "ready"
            });

            await metadata.set("status", "completed");

            logger.info(
                { documentId, knowledgeBaseId },
                "Document processing completed"
            );

            return {
                success: true,
                documentId,
                chunks: 0 // TODO: Return actual chunk count
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error(
                { documentId, knowledgeBaseId, error: errorMessage },
                "Document processing failed"
            );

            // Update document status to failed
            await docRepo.update(documentId, {
                status: "failed",
                error_message: errorMessage
            });

            await metadata.set("status", "failed");
            await metadata.set("error", errorMessage);

            return {
                success: false,
                documentId,
                error: errorMessage
            };
        }
    }
});
