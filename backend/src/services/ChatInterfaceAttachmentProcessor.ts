/**
 * Chat Interface Attachment Processor
 *
 * Processes file attachments for chat interfaces:
 * - Downloads files from GCS
 * - Extracts text content
 * - Chunks text into smaller pieces
 * - Generates embeddings
 * - Stores chunks for RAG querying
 */

import * as fs from "fs/promises";
import * as path from "path";
import type { ChatMessageAttachment, JsonObject } from "@flowmaestro/shared";
import { createServiceLogger } from "../core/logging";
import {
    ChatInterfaceMessageChunkRepository,
    type CreateChunkInput
} from "../storage/repositories/ChatInterfaceMessageChunkRepository";
import { EmbeddingService } from "./embeddings/EmbeddingService";
import { TextChunker } from "./embeddings/TextChunker";
import { TextExtractor } from "./embeddings/TextExtractor";
import { GCSStorageService } from "./GCSStorageService";
import type { DocumentFileType } from "../storage/models/KnowledgeDocument";

const logger = createServiceLogger("ChatInterfaceAttachmentProcessor");

// Supported file types for text extraction
const SUPPORTED_FILE_TYPES: Set<string> = new Set([
    "pdf",
    "docx",
    "doc",
    "txt",
    "md",
    "html",
    "json",
    "csv"
]);

// MIME type to file type mapping
const MIME_TO_FILE_TYPE: Record<string, DocumentFileType> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "text/plain": "txt",
    "text/markdown": "md",
    "text/html": "html",
    "application/json": "json",
    "text/csv": "csv"
};

export interface ProcessAttachmentResult {
    success: boolean;
    fileName: string;
    chunksCreated: number;
    error?: string;
}

export interface ProcessAttachmentsInput {
    attachments: ChatMessageAttachment[];
    sessionId: string;
    threadId?: string;
    userId?: string; // For embedding service connection lookup
}

export class ChatInterfaceAttachmentProcessor {
    private gcsService: GCSStorageService;
    private textExtractor: TextExtractor;
    private textChunker: TextChunker;
    private embeddingService: EmbeddingService;
    private chunkRepository: ChatInterfaceMessageChunkRepository;

    constructor() {
        this.gcsService = new GCSStorageService("uploads");
        this.textExtractor = new TextExtractor();
        this.textChunker = new TextChunker({
            chunkSize: 1000,
            chunkOverlap: 200
        });
        this.embeddingService = new EmbeddingService();
        this.chunkRepository = new ChatInterfaceMessageChunkRepository();
    }

    /**
     * Process all attachments for a chat message
     */
    async processAttachments(input: ProcessAttachmentsInput): Promise<ProcessAttachmentResult[]> {
        const { attachments, sessionId, threadId, userId } = input;
        const results: ProcessAttachmentResult[] = [];

        for (let index = 0; index < attachments.length; index++) {
            const attachment = attachments[index];
            const result = await this.processAttachment(
                attachment,
                sessionId,
                threadId,
                index,
                userId
            );
            results.push(result);
        }

        return results;
    }

    /**
     * Process a single attachment
     */
    private async processAttachment(
        attachment: ChatMessageAttachment,
        sessionId: string,
        threadId: string | undefined,
        sourceIndex: number,
        userId?: string
    ): Promise<ProcessAttachmentResult> {
        const fileName = attachment.fileName || "unknown";

        // Handle URL type attachments
        if (attachment.type === "url" && attachment.url) {
            return this.processUrlAttachment(attachment, sessionId, threadId, sourceIndex, userId);
        }

        // Handle file type attachments
        if (attachment.type === "file" && attachment.gcsUri) {
            return this.processFileAttachment(attachment, sessionId, threadId, sourceIndex, userId);
        }

        return {
            success: false,
            fileName,
            chunksCreated: 0,
            error: "Invalid attachment: missing gcsUri for file or url for URL type"
        };
    }

    /**
     * Process a file attachment from GCS
     */
    private async processFileAttachment(
        attachment: ChatMessageAttachment,
        sessionId: string,
        threadId: string | undefined,
        sourceIndex: number,
        userId?: string
    ): Promise<ProcessAttachmentResult> {
        const fileName = attachment.fileName || "unknown";
        let tempFilePath: string | null = null;

        try {
            // Determine file type
            const fileType = this.getFileType(attachment);
            if (!fileType || !SUPPORTED_FILE_TYPES.has(fileType)) {
                logger.info(
                    { fileName, mimeType: attachment.mimeType },
                    "Skipping unsupported file type"
                );
                return {
                    success: true,
                    fileName,
                    chunksCreated: 0,
                    error: `Unsupported file type: ${attachment.mimeType || "unknown"}`
                };
            }

            logger.info(
                { fileName, fileType, gcsUri: attachment.gcsUri },
                "Processing file attachment"
            );

            // Download from GCS
            tempFilePath = await this.gcsService.downloadToTemp({
                gcsUri: attachment.gcsUri!
            });

            // Extract text
            const extracted = await this.textExtractor.extractFromFile(
                tempFilePath,
                fileType as DocumentFileType
            );

            if (!extracted.content || extracted.content.trim().length === 0) {
                logger.info({ fileName }, "No text content extracted from file");
                return {
                    success: true,
                    fileName,
                    chunksCreated: 0,
                    error: "No text content found in file"
                };
            }

            // Chunk the text
            const chunks = this.textChunker.chunkText(extracted.content, {
                fileName,
                fileType,
                ...extracted.metadata
            });

            if (chunks.length === 0) {
                return {
                    success: true,
                    fileName,
                    chunksCreated: 0,
                    error: "Text extracted but no chunks generated"
                };
            }

            // Generate embeddings for all chunks
            const chunkContents = chunks.map((c) => c.content);
            const embeddingResult = await this.embeddingService.generateEmbeddings(
                chunkContents,
                {
                    model: "text-embedding-3-small",
                    provider: "openai"
                },
                userId
            );

            // Create chunk inputs (filter out undefined values from metadata)
            const chunkInputs: CreateChunkInput[] = chunks.map((chunk, idx) => ({
                sessionId,
                threadId,
                sourceType: "file" as const,
                sourceName: fileName,
                sourceIndex,
                content: chunk.content,
                chunkIndex: chunk.index,
                embedding: embeddingResult.embeddings[idx],
                metadata: this.cleanMetadata(chunk.metadata)
            }));

            // Store chunks
            await this.chunkRepository.createChunks(chunkInputs);

            logger.info(
                {
                    fileName,
                    chunksCreated: chunks.length,
                    totalTokens: embeddingResult.usage.total_tokens
                },
                "File attachment processed successfully"
            );

            return {
                success: true,
                fileName,
                chunksCreated: chunks.length
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            logger.error({ fileName, error: errorMsg }, "Failed to process file attachment");
            return {
                success: false,
                fileName,
                chunksCreated: 0,
                error: errorMsg
            };
        } finally {
            // Clean up temp file
            if (tempFilePath) {
                try {
                    await fs.unlink(tempFilePath);
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }

    /**
     * Process a URL attachment
     */
    private async processUrlAttachment(
        attachment: ChatMessageAttachment,
        sessionId: string,
        threadId: string | undefined,
        sourceIndex: number,
        userId?: string
    ): Promise<ProcessAttachmentResult> {
        const url = attachment.url!;

        try {
            logger.info({ url }, "Processing URL attachment");

            // Extract text from URL
            const extracted = await this.textExtractor.extractFromURL(url);

            if (!extracted.content || extracted.content.trim().length === 0) {
                logger.info({ url }, "No text content extracted from URL");
                return {
                    success: true,
                    fileName: url,
                    chunksCreated: 0,
                    error: "No text content found at URL"
                };
            }

            // Chunk the text
            const chunks = this.textChunker.chunkText(extracted.content, {
                url,
                ...extracted.metadata
            });

            if (chunks.length === 0) {
                return {
                    success: true,
                    fileName: url,
                    chunksCreated: 0,
                    error: "Text extracted but no chunks generated"
                };
            }

            // Generate embeddings
            const chunkContents = chunks.map((c) => c.content);
            const embeddingResult = await this.embeddingService.generateEmbeddings(
                chunkContents,
                {
                    model: "text-embedding-3-small",
                    provider: "openai"
                },
                userId
            );

            // Create chunk inputs (filter out undefined values from metadata)
            const chunkInputs: CreateChunkInput[] = chunks.map((chunk, idx) => ({
                sessionId,
                threadId,
                sourceType: "url" as const,
                sourceName: url,
                sourceIndex,
                content: chunk.content,
                chunkIndex: chunk.index,
                embedding: embeddingResult.embeddings[idx],
                metadata: this.cleanMetadata(chunk.metadata)
            }));

            // Store chunks
            await this.chunkRepository.createChunks(chunkInputs);

            logger.info(
                {
                    url,
                    chunksCreated: chunks.length,
                    totalTokens: embeddingResult.usage.total_tokens
                },
                "URL attachment processed successfully"
            );

            return {
                success: true,
                fileName: url,
                chunksCreated: chunks.length
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            logger.error({ url, error: errorMsg }, "Failed to process URL attachment");
            return {
                success: false,
                fileName: url,
                chunksCreated: 0,
                error: errorMsg
            };
        }
    }

    /**
     * Determine file type from attachment
     */
    private getFileType(attachment: ChatMessageAttachment): string | null {
        // Try MIME type first
        if (attachment.mimeType && MIME_TO_FILE_TYPE[attachment.mimeType]) {
            return MIME_TO_FILE_TYPE[attachment.mimeType];
        }

        // Fall back to file extension
        if (attachment.fileName) {
            const ext = path.extname(attachment.fileName).toLowerCase().slice(1);
            if (SUPPORTED_FILE_TYPES.has(ext)) {
                return ext;
            }
        }

        return null;
    }

    /**
     * Clean metadata by removing undefined values (for JsonObject compatibility)
     */
    private cleanMetadata(metadata: Record<string, unknown>): JsonObject {
        const cleaned: JsonObject = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (value !== undefined) {
                cleaned[key] = value as JsonObject[string];
            }
        }
        return cleaned;
    }
}
