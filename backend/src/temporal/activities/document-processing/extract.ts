/**
 * Extract Text Activity
 *
 * Extracts text content from documents (files or URLs) for any storage target.
 */

import * as fs from "fs/promises";
import { createServiceLogger } from "../../../core/logging";
import { TextExtractor } from "../../../services/embeddings/TextExtractor";
import { globalEventEmitter } from "../../../services/events/EventEmitter";
import { getGCSStorageService } from "../../../services/GCSStorageService";
import { KnowledgeDocumentRepository } from "../../../storage/repositories/KnowledgeDocumentRepository";
import type { ExtractTextInput } from "./types";
import type { DocumentFileType } from "../../../storage/models/KnowledgeDocument";

const logger = createServiceLogger("ExtractTextActivity");

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

/**
 * Sanitize text to remove invalid UTF-8 characters and null bytes
 * PostgreSQL doesn't allow null bytes in TEXT fields
 */
function sanitizeText(text: string): string {
    /* eslint-disable no-control-regex */
    return text
        .replace(/\x00/g, "") // Remove null bytes
        .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Remove other control chars
        .trim();
    /* eslint-enable no-control-regex */
}

/**
 * Map MIME type to document file type
 */
function mimeTypeToFileType(mimeType: string): DocumentFileType {
    return MIME_TO_FILE_TYPE[mimeType] || "txt";
}

/**
 * Extract text from a document source
 */
export async function extractDocumentText(input: ExtractTextInput): Promise<string> {
    logger.info(
        {
            storageTarget: input.storageTarget,
            documentId: input.documentId,
            submissionId: input.submissionId,
            sessionId: input.sessionId,
            sourceName: input.sourceName
        },
        "Starting text extraction"
    );

    const textExtractor = new TextExtractor();
    const documentRepo = new KnowledgeDocumentRepository();

    let tempFilePath: string | null = null;

    try {
        // For knowledge base documents, update status and emit event
        if (input.storageTarget === "knowledge-base" && input.documentId) {
            await documentRepo.updateStatus(input.documentId, "processing");
            const document = await documentRepo.findById(input.documentId);
            globalEventEmitter.emitDocumentProcessing(
                input.knowledgeBaseId!,
                input.documentId,
                document?.name || "Unknown"
            );
        }

        let extractedText: { content: string; metadata: Record<string, unknown> };

        // Handle URL extraction
        if (input.sourceUrl || (input.sourceType === "url" && input.url)) {
            const url = input.sourceUrl || input.url!;
            logger.info({ url }, "Extracting from URL");

            try {
                extractedText = await textExtractor.extractFromURL(url);
                logger.info(
                    { url, characterCount: extractedText.content.length },
                    "Successfully extracted from URL"
                );
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                logger.error({ url, error: errorMsg }, "Failed to extract from URL");
                throw error;
            }
        }
        // Handle file extraction (GCS or local)
        else if (input.filePath || input.gcsPath) {
            const filePath = input.filePath || input.gcsPath!;
            const isGCSUri = filePath.startsWith("gs://");

            let localPath: string;

            if (isGCSUri) {
                logger.info({ gcsUri: filePath }, "Downloading file from GCS");
                const gcsService = getGCSStorageService();
                tempFilePath = await gcsService.downloadToTemp({ gcsUri: filePath });
                localPath = tempFilePath;
                logger.info({ tempFilePath }, "Downloaded to temp");
            } else {
                localPath = filePath;
            }

            // Determine file type
            const fileType = input.fileType || mimeTypeToFileType(input.mimeType || "text/plain");

            extractedText = await textExtractor.extractFromFile(localPath, fileType);
            logger.info(
                { characterCount: extractedText.content.length },
                "Successfully extracted from file"
            );
        } else {
            throw new Error("Either filePath/gcsPath or sourceUrl/url must be provided");
        }

        // Sanitize content
        const sanitizedContent = sanitizeText(extractedText.content);

        if (!sanitizedContent || sanitizedContent.trim().length === 0) {
            throw new Error("No valid content extracted from document after sanitization");
        }

        // For knowledge base, update document with extracted content
        if (input.storageTarget === "knowledge-base" && input.documentId) {
            // Cast metadata - TextExtractor returns compatible JSON values
            const documentMetadata = extractedText.metadata as Parameters<
                typeof documentRepo.update
            >[1]["metadata"];
            await documentRepo.update(input.documentId, {
                content: sanitizedContent,
                metadata: documentMetadata
            });
        }

        logger.info(
            {
                storageTarget: input.storageTarget,
                characterCount: sanitizedContent.length
            },
            "Text extraction completed"
        );

        return sanitizedContent;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMsg }, "Text extraction failed");

        // For knowledge base, update status and emit failure event
        if (input.storageTarget === "knowledge-base" && input.documentId) {
            await documentRepo.updateStatus(input.documentId, "failed", errorMsg);
            globalEventEmitter.emitDocumentFailed(
                input.knowledgeBaseId!,
                input.documentId,
                errorMsg
            );
        }

        throw error;
    } finally {
        // Clean up temporary file
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
                logger.info({ tempFilePath }, "Cleaned up temp file");
            } catch {
                logger.warn({ tempFilePath }, "Failed to delete temp file");
            }
        }
    }
}
