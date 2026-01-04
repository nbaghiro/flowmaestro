/**
 * Files Node Handler
 *
 * Handles file input processing at workflow start.
 * Downloads files from GCS, extracts text, and chunks content.
 * Files are provided when workflow is triggered (not human-in-the-loop).
 */

import * as fs from "fs/promises";
import type {
    FileChunk,
    FileInputData,
    FilesNodeOutput,
    JsonObject,
    ProcessedFile
} from "@flowmaestro/shared";
import { TextChunker } from "../../../../../services/embeddings/TextChunker";
import { TextExtractor } from "../../../../../services/embeddings/TextExtractor";
import { getUploadsStorageService } from "../../../../../services/GCSStorageService";
import { createActivityLogger } from "../../../../core";
import {
    FilesNodeConfigSchema,
    validateOrThrow,
    type FilesNodeConfig,
    type SupportedFileType
} from "../../../../core/schemas";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";
import type { DocumentFileType } from "../../../../../storage/models/KnowledgeDocument";

const logger = createActivityLogger({ nodeType: "Files" });

// ============================================================================
// TYPES
// ============================================================================

export type { FilesNodeConfig };

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Files node type.
 * Processes uploaded files from workflow inputs at trigger time.
 */
export class FilesNodeHandler extends BaseNodeHandler {
    readonly name = "FilesNodeHandler";
    readonly supportedNodeTypes = ["files"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const config = validateOrThrow(FilesNodeConfigSchema, input.nodeConfig, "Files");

        logger.info("Processing files node", {
            inputName: config.inputName,
            required: config.required,
            chunkSize: config.chunkSize,
            chunkOverlap: config.chunkOverlap
        });

        // Get files from workflow inputs
        const filesInput = input.context.inputs?.[config.inputName];

        if (!filesInput) {
            if (config.required) {
                const errorMessage = `Required files input '${config.inputName}' was not provided`;
                logger.error(errorMessage, new Error(errorMessage), {
                    inputName: config.inputName,
                    nodeId: input.metadata.nodeId
                });
                throw new Error(
                    `Required files input '${config.inputName}' was not provided. ` +
                        "Ensure files are passed when starting the workflow."
                );
            }

            // Return empty result for optional input
            logger.debug("Optional files input not provided, returning empty result");
            const emptyResult: FilesNodeOutput = {
                files: [],
                allChunks: [],
                combinedText: "",
                fileCount: 0,
                totalChunkCount: 0
            };

            return this.success(
                { [config.outputVariable]: emptyResult as unknown as JsonObject },
                {},
                { durationMs: Date.now() - startTime }
            );
        }

        // Parse files input (array of FileInputData)
        const fileInputs: FileInputData[] = Array.isArray(filesInput)
            ? (filesInput as unknown as FileInputData[])
            : [filesInput as unknown as FileInputData];

        logger.info("Processing files", { fileCount: fileInputs.length });

        // Validate file types if restrictions are set
        if (config.allowedFileTypes && config.allowedFileTypes.length > 0) {
            for (const fileInput of fileInputs) {
                if (!config.allowedFileTypes.includes(fileInput.fileType as SupportedFileType)) {
                    throw new Error(
                        `File type '${fileInput.fileType}' is not allowed for file '${fileInput.fileName}'. ` +
                            `Allowed types: ${config.allowedFileTypes.join(", ")}`
                    );
                }
            }
        }

        // Initialize services - use uploads bucket for user-uploaded workflow files
        const gcsService = getUploadsStorageService();
        const textExtractor = new TextExtractor();
        const textChunker = new TextChunker({
            chunkSize: config.chunkSize,
            chunkOverlap: config.chunkOverlap
        });

        // Process each file
        const processedFiles: ProcessedFile[] = [];
        const allChunks: FileChunk[] = [];
        const allTexts: string[] = [];

        for (const fileInput of fileInputs) {
            logger.debug("Processing file", {
                fileName: fileInput.fileName,
                fileType: fileInput.fileType
            });

            let tempFilePath: string | null = null;

            try {
                // Download file from GCS to temp location
                tempFilePath = await gcsService.downloadToTemp({
                    gcsUri: fileInput.gcsUri
                });

                // Extract text from file
                const extracted = await textExtractor.extractFromFile(
                    tempFilePath,
                    fileInput.fileType as DocumentFileType
                );

                // Chunk the extracted text
                const textChunks = textChunker.chunkText(extracted.content, {
                    fileName: fileInput.fileName,
                    fileType: fileInput.fileType
                });

                // Convert to FileChunk format
                const fileChunks: FileChunk[] = textChunks.map((chunk, index) => ({
                    content: chunk.content,
                    index,
                    metadata: {
                        fileName: fileInput.fileName,
                        fileType: fileInput.fileType,
                        start_char: chunk.metadata.start_char,
                        end_char: chunk.metadata.end_char,
                        sentence_count:
                            typeof chunk.metadata.sentence_count === "number"
                                ? chunk.metadata.sentence_count
                                : undefined
                    }
                }));

                // Build processed file result
                const processedFile: ProcessedFile = {
                    fileName: fileInput.fileName,
                    fileType: fileInput.fileType,
                    gcsUri: fileInput.gcsUri,
                    chunks: fileChunks,
                    extractedText: extracted.content,
                    metadata: {
                        wordCount: extracted.metadata.wordCount,
                        pages: extracted.metadata.pages
                    }
                };

                processedFiles.push(processedFile);
                allChunks.push(...fileChunks);
                allTexts.push(extracted.content);

                logger.debug("File processed successfully", {
                    fileName: fileInput.fileName,
                    chunkCount: fileChunks.length,
                    wordCount: extracted.metadata.wordCount
                });
            } catch (error) {
                const errorMessage = `Failed to process file '${fileInput.fileName}'`;
                const actualError = error instanceof Error ? error : new Error(String(error));
                logger.error(errorMessage, actualError, {
                    fileName: fileInput.fileName
                });
                throw new Error(`${errorMessage}: ${actualError.message}`);
            } finally {
                // Clean up temp file
                if (tempFilePath) {
                    await fs.unlink(tempFilePath).catch((err) => {
                        logger.warn("Failed to clean up temp file", {
                            tempFilePath,
                            error: err instanceof Error ? err.message : String(err)
                        });
                    });
                }
            }
        }

        // Build final output
        const result: FilesNodeOutput = {
            files: processedFiles,
            allChunks,
            combinedText: allTexts.join("\n\n---\n\n"),
            fileCount: processedFiles.length,
            totalChunkCount: allChunks.length
        };

        logger.info("Files processed successfully", {
            fileCount: result.fileCount,
            totalChunks: result.totalChunkCount,
            combinedTextLength: result.combinedText.length
        });

        return this.success(
            { [config.outputVariable]: result as unknown as JsonObject },
            {},
            {
                durationMs: Date.now() - startTime,
                dataSizeBytes: result.combinedText.length
            }
        );
    }
}

/**
 * Factory function for creating Files handler.
 */
export function createFilesNodeHandler(): FilesNodeHandler {
    return new FilesNodeHandler();
}
