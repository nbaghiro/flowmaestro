/**
 * Form Submission Attachment Activities
 *
 * Activities for processing form submission attachments:
 * - Text extraction from files and URLs
 * - Text chunking
 * - Embedding generation and storage
 */

import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { Storage } from "@google-cloud/storage";
import { createServiceLogger } from "../../core/logging";
import { EmbeddingService } from "../../services/embeddings/EmbeddingService";
import { TextChunker } from "../../services/embeddings/TextChunker";
import { TextExtractor } from "../../services/embeddings/TextExtractor";
import { FormInterfaceSubmissionChunkRepository } from "../../storage/repositories/FormInterfaceSubmissionChunkRepository";
import { FormInterfaceSubmissionRepository } from "../../storage/repositories/FormInterfaceSubmissionRepository";
import type { DocumentFileType } from "../../storage/models/KnowledgeDocument";

const logger = createServiceLogger("FormSubmissionAttachmentActivities");

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractSubmissionAttachmentInput {
    submissionId: string;
    sourceType: "file" | "url";
    sourceName: string;
    sourceIndex: number;
    gcsPath?: string;
    mimeType?: string;
    url?: string;
}

export interface ChunkSubmissionAttachmentInput {
    submissionId: string;
    content: string;
    sourceType: "file" | "url";
    sourceName: string;
    sourceIndex: number;
}

export interface ChunkResult {
    content: string;
    index: number;
    metadata: Record<string, unknown>;
}

export interface StoreSubmissionChunksInput {
    submissionId: string;
    chunks: ChunkResult[];
    sourceType: "file" | "url";
    sourceName: string;
    sourceIndex: number;
}

export interface CompleteSubmissionProcessingInput {
    submissionId: string;
    success: boolean;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Map MIME type to document file type
 */
function mimeTypeToFileType(mimeType: string): DocumentFileType {
    const mimeMap: Record<string, DocumentFileType> = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/msword": "doc",
        "text/plain": "txt",
        "text/markdown": "md",
        "text/html": "html",
        "application/json": "json",
        "text/csv": "csv"
    };

    return mimeMap[mimeType] || "txt";
}

// ============================================================================
// ACTIVITIES
// ============================================================================

/**
 * Extract text from a form submission attachment (file or URL)
 */
export async function extractSubmissionAttachmentText(
    input: ExtractSubmissionAttachmentInput
): Promise<string> {
    logger.info(
        {
            submissionId: input.submissionId,
            sourceType: input.sourceType,
            sourceName: input.sourceName
        },
        "Starting text extraction for submission attachment"
    );

    const textExtractor = new TextExtractor();

    if (input.sourceType === "url" && input.url) {
        // Extract from URL
        try {
            const result = await textExtractor.extractFromURL(input.url);
            logger.info(
                {
                    submissionId: input.submissionId,
                    url: input.url,
                    contentLength: result.content.length
                },
                "Extracted text from URL"
            );
            return result.content;
        } catch (error) {
            logger.error(
                { submissionId: input.submissionId, url: input.url, error },
                "Failed to extract text from URL"
            );
            throw error;
        }
    }

    if (input.sourceType === "file" && input.gcsPath) {
        // Download file from GCS to temp location
        const storage = new Storage();
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "form-attachment-"));
        const tempFilePath = path.join(tempDir, path.basename(input.sourceName));

        try {
            // Parse GCS path (format: gs://bucket/path or bucket/path)
            let bucket: string;
            let filePath: string;

            if (input.gcsPath.startsWith("gs://")) {
                const gcsUrl = new URL(input.gcsPath);
                bucket = gcsUrl.hostname;
                filePath = gcsUrl.pathname.slice(1); // Remove leading /
            } else {
                const parts = input.gcsPath.split("/");
                bucket = parts[0];
                filePath = parts.slice(1).join("/");
            }

            // Download file
            await storage.bucket(bucket).file(filePath).download({
                destination: tempFilePath
            });

            // Determine file type and extract text
            const fileType = mimeTypeToFileType(input.mimeType || "text/plain");
            const result = await textExtractor.extractFromFile(tempFilePath, fileType);

            logger.info(
                {
                    submissionId: input.submissionId,
                    filename: input.sourceName,
                    contentLength: result.content.length
                },
                "Extracted text from file"
            );

            return result.content;
        } catch (error) {
            logger.error(
                { submissionId: input.submissionId, filename: input.sourceName, error },
                "Failed to extract text from file"
            );
            throw error;
        } finally {
            // Cleanup temp file
            try {
                await fs.rm(tempDir, { recursive: true });
            } catch {
                // Ignore cleanup errors
            }
        }
    }

    throw new Error(`Invalid input: sourceType=${input.sourceType} requires gcsPath or url`);
}

/**
 * Chunk extracted text into smaller pieces
 */
export async function chunkSubmissionAttachmentText(
    input: ChunkSubmissionAttachmentInput
): Promise<ChunkResult[]> {
    logger.info(
        {
            submissionId: input.submissionId,
            sourceName: input.sourceName,
            contentLength: input.content.length
        },
        "Starting text chunking for submission attachment"
    );

    const chunker = new TextChunker({
        chunkSize: 1000,
        chunkOverlap: 200
    });

    const chunks = chunker.chunkText(input.content, {
        submission_id: input.submissionId,
        source_type: input.sourceType,
        source_name: input.sourceName,
        source_index: input.sourceIndex
    });

    logger.info(
        {
            submissionId: input.submissionId,
            sourceName: input.sourceName,
            chunkCount: chunks.length
        },
        "Created chunks from attachment"
    );

    return chunks.map((chunk) => ({
        content: chunk.content,
        index: chunk.index,
        metadata: chunk.metadata as Record<string, unknown>
    }));
}

/**
 * Generate embeddings and store chunks in the database
 */
export async function generateAndStoreSubmissionChunks(
    input: StoreSubmissionChunksInput
): Promise<{ chunkCount: number; totalTokens: number }> {
    logger.info(
        {
            submissionId: input.submissionId,
            sourceName: input.sourceName,
            chunkCount: input.chunks.length
        },
        "Generating embeddings and storing chunks"
    );

    const embeddingService = new EmbeddingService();
    const chunkRepo = new FormInterfaceSubmissionChunkRepository();

    // Generate embeddings for all chunks
    const texts = input.chunks.map((chunk) => chunk.content);
    const embeddingResult = await embeddingService.generateEmbeddings(texts, {
        model: "text-embedding-3-small",
        provider: "openai"
    });

    // Prepare chunks for storage
    const chunksToStore = input.chunks.map((chunk, index) => ({
        submissionId: input.submissionId,
        sourceType: input.sourceType,
        sourceName: input.sourceName,
        sourceIndex: input.sourceIndex,
        content: chunk.content,
        chunkIndex: chunk.index,
        embedding: embeddingResult.embeddings[index],
        metadata: chunk.metadata
    }));

    // Store chunks
    await chunkRepo.createChunks(chunksToStore);

    logger.info(
        {
            submissionId: input.submissionId,
            sourceName: input.sourceName,
            chunkCount: chunksToStore.length,
            totalTokens: embeddingResult.usage.total_tokens
        },
        "Stored submission chunks with embeddings"
    );

    return {
        chunkCount: chunksToStore.length,
        totalTokens: embeddingResult.usage.total_tokens
    };
}

/**
 * Mark submission attachment processing as complete
 */
export async function completeSubmissionAttachmentProcessing(
    input: CompleteSubmissionProcessingInput
): Promise<void> {
    logger.info(
        { submissionId: input.submissionId, success: input.success },
        "Completing submission attachment processing"
    );

    const submissionRepo = new FormInterfaceSubmissionRepository();

    await submissionRepo.updateAttachmentsStatus(
        input.submissionId,
        input.success ? "ready" : "failed"
    );

    logger.info(
        { submissionId: input.submissionId, status: input.success ? "ready" : "failed" },
        "Updated submission attachments status"
    );
}
