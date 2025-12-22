import * as fs from "fs/promises";
import type { JsonValue } from "@flowmaestro/shared";
import { EmbeddingService } from "../../services/embeddings/EmbeddingService";
import { TextChunker } from "../../services/embeddings/TextChunker";
import { TextExtractor } from "../../services/embeddings/TextExtractor";
import { globalEventEmitter } from "../../services/events/EventEmitter";
import { getGCSStorageService } from "../../services/GCSStorageService";
import { CreateKnowledgeChunkInput } from "../../storage/models/KnowledgeChunk";
import { DocumentFileType } from "../../storage/models/KnowledgeDocument";
import {
    KnowledgeDocumentRepository,
    KnowledgeChunkRepository,
    KnowledgeBaseRepository
} from "../../storage/repositories";

export interface ProcessDocumentInput {
    documentId: string;
    knowledgeBaseId: string;
    filePath?: string;
    sourceUrl?: string;
    fileType: DocumentFileType;
    userId?: string;
}

const documentRepository = new KnowledgeDocumentRepository();
const chunkRepository = new KnowledgeChunkRepository();
const kbRepository = new KnowledgeBaseRepository();
const textExtractor = new TextExtractor();
const embeddingService = new EmbeddingService();

/**
 * Sanitize text to remove invalid UTF-8 characters and null bytes
 * PostgreSQL doesn't allow null bytes in TEXT fields
 */
function sanitizeText(text: string): string {
    // Remove null bytes and other control characters except newlines/tabs
    /* eslint-disable no-control-regex */
    return text
        .replace(/\x00/g, "") // Remove null bytes
        .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Remove other control chars
        .trim();
    /* eslint-enable no-control-regex */
}

/**
 * Activity: Extract text from document
 */
export async function extractTextActivity(input: ProcessDocumentInput): Promise<string> {
    console.log(`[extractTextActivity] Starting text extraction for document ${input.documentId}`);

    let tempFilePath: string | null = null;

    try {
        // Update status to processing
        await documentRepository.updateStatus(input.documentId, "processing");

        // Get document details for event
        const document = await documentRepository.findById(input.documentId);

        // Emit processing event
        globalEventEmitter.emitDocumentProcessing(
            input.knowledgeBaseId,
            input.documentId,
            document?.name || "Unknown"
        );

        let extractedText: { content: string; metadata: Record<string, unknown> };

        if (input.sourceUrl) {
            // Extract from URL
            console.log(`[extractTextActivity] Extracting from URL: ${input.sourceUrl}`);
            try {
                extractedText = await textExtractor.extractFromURL(input.sourceUrl);
                console.log(
                    `[extractTextActivity] Successfully extracted ${extractedText.content.length} characters from URL`
                );
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`[extractTextActivity] Failed to extract from URL: ${errorMsg}`);
                throw error;
            }
        } else if (input.filePath) {
            // Check if file path is a GCS URI
            const isGCSUri = input.filePath.startsWith("gs://");

            if (isGCSUri) {
                // Download from GCS to temporary location
                console.log(`[extractTextActivity] Downloading file from GCS: ${input.filePath}`);
                const gcsService = getGCSStorageService();
                tempFilePath = await gcsService.downloadToTemp({ gcsUri: input.filePath });
                console.log(`[extractTextActivity] Downloaded to temp: ${tempFilePath}`);

                // Extract from temporary file
                extractedText = await textExtractor.extractFromFile(tempFilePath, input.fileType);
            } else {
                // Extract from local file (for backwards compatibility during migration)
                extractedText = await textExtractor.extractFromFile(input.filePath, input.fileType);
            }
        } else {
            throw new Error("Either filePath or sourceUrl must be provided");
        }

        // Sanitize content to remove invalid UTF-8 characters
        const sanitizedContent = sanitizeText(extractedText.content);

        if (!sanitizedContent || sanitizedContent.trim().length === 0) {
            throw new Error("No valid content extracted from document after sanitization");
        }

        // Update document with extracted content and metadata
        // Cast metadata to DocumentMetadata since TextExtractor returns Record<string, unknown>
        const documentMetadata = extractedText.metadata as Record<string, JsonValue | undefined>;

        await documentRepository.update(input.documentId, {
            content: sanitizedContent,
            metadata: documentMetadata
        });

        console.log(
            `[extractTextActivity] Successfully extracted ${sanitizedContent.length} characters`
        );

        return sanitizedContent;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[extractTextActivity] Error:", error);
        await documentRepository.updateStatus(input.documentId, "failed", errorMsg);

        // Emit document failed event
        globalEventEmitter.emitDocumentFailed(input.knowledgeBaseId, input.documentId, errorMsg);

        throw error;
    } finally {
        // Clean up temporary file if it was created
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
                console.log(`[extractTextActivity] Cleaned up temp file: ${tempFilePath}`);
            } catch (error: unknown) {
                console.warn(
                    `[extractTextActivity] Failed to delete temp file: ${tempFilePath}`,
                    error
                );
            }
        }
    }
}

/**
 * Activity: Chunk text into smaller pieces
 */
export async function chunkTextActivity(input: ProcessDocumentInput & { content: string }): Promise<
    Array<{
        content: string;
        index: number;
        metadata: unknown;
    }>
> {
    console.log(`[chunkTextActivity] Starting text chunking for document ${input.documentId}`);

    try {
        // Get KB config for chunk settings
        const kb = await kbRepository.findById(input.knowledgeBaseId);
        if (!kb) {
            throw new Error(`Knowledge base ${input.knowledgeBaseId} not found`);
        }

        const chunker = new TextChunker({
            chunkSize: kb.config.chunkSize,
            chunkOverlap: kb.config.chunkOverlap
        });

        // Get document metadata
        const document = await documentRepository.findById(input.documentId);

        // Chunk the text
        const chunks = chunker.chunkText(input.content, {
            document_id: input.documentId,
            document_name: document?.name,
            file_type: input.fileType
        });

        // Sanitize each chunk to ensure no invalid characters
        const sanitizedChunks = chunks.map((chunk) => ({
            ...chunk,
            content: sanitizeText(chunk.content)
        }));

        console.log(`[chunkTextActivity] Created ${sanitizedChunks.length} chunks`);

        return sanitizedChunks;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[chunkTextActivity] Error:", error);
        await documentRepository.updateStatus(input.documentId, "failed", errorMsg);

        // Emit document failed event
        globalEventEmitter.emitDocumentFailed(input.knowledgeBaseId, input.documentId, errorMsg);

        throw error;
    }
}

/**
 * Activity: Generate embeddings and store chunks with embeddings
 * Combined activity to avoid passing large embedding arrays through Temporal
 */
export async function generateAndStoreEmbeddingsActivity(
    input: ProcessDocumentInput & {
        chunks: Array<{
            content: string;
            index: number;
            metadata: unknown;
        }>;
    }
): Promise<{ chunkCount: number; totalTokens: number }> {
    console.log(`[generateAndStoreEmbeddingsActivity] Processing ${input.chunks.length} chunks`);

    try {
        // Get KB config for embedding settings
        const kb = await kbRepository.findById(input.knowledgeBaseId);
        if (!kb) {
            throw new Error(`Knowledge base ${input.knowledgeBaseId} not found`);
        }

        // Extract text from chunks
        const texts = input.chunks.map((chunk) => chunk.content);

        // Generate embeddings
        console.log("[generateAndStoreEmbeddingsActivity] Generating embeddings...");
        const result = await embeddingService.generateEmbeddings(
            texts,
            {
                model: kb.config.embeddingModel,
                provider: kb.config.embeddingProvider,
                dimensions: kb.config.embeddingDimensions
            },
            input.userId
        );

        console.log(
            `[generateAndStoreEmbeddingsActivity] Generated ${result.embeddings.length} embeddings, used ${result.usage.total_tokens} tokens`
        );

        // Store chunks with embeddings immediately
        console.log("[generateAndStoreEmbeddingsActivity] Storing chunks in database...");
        const chunkInputs: CreateKnowledgeChunkInput[] = input.chunks.map((chunk, index) => ({
            document_id: input.documentId,
            knowledge_base_id: input.knowledgeBaseId,
            chunk_index: chunk.index,
            content: chunk.content,
            embedding: result.embeddings[index],
            token_count: embeddingService.estimateTokens(chunk.content),
            metadata: chunk.metadata as Record<string, JsonValue | undefined>
        }));

        // Batch insert chunks
        const createdChunks = await chunkRepository.batchInsert(chunkInputs);

        console.log(
            `[generateAndStoreEmbeddingsActivity] Successfully stored ${createdChunks.length} chunks`
        );

        return {
            chunkCount: createdChunks.length,
            totalTokens: result.usage.total_tokens
        };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[generateAndStoreEmbeddingsActivity] Error:", error);
        await documentRepository.updateStatus(input.documentId, "failed", errorMsg);

        // Emit document failed event
        globalEventEmitter.emitDocumentFailed(input.knowledgeBaseId, input.documentId, errorMsg);

        throw error;
    }
}

/**
 * Activity: Mark document as ready
 */
export async function completeDocumentProcessingActivity(
    input: ProcessDocumentInput
): Promise<void> {
    console.log(
        `[completeDocumentProcessingActivity] Marking document ${input.documentId} as ready`
    );

    try {
        await documentRepository.updateStatus(input.documentId, "ready");
        console.log("[completeDocumentProcessingActivity] Document marked as ready");

        // Get chunk count for the completed document
        const chunks = await chunkRepository.findByDocumentId(input.documentId);

        // Emit document completed event with chunk count
        globalEventEmitter.emitDocumentCompleted(
            input.knowledgeBaseId,
            input.documentId,
            chunks.length
        );
    } catch (error: unknown) {
        console.error("[completeDocumentProcessingActivity] Error:", error);
        throw error;
    }
}
