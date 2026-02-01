/**
 * Form Submission Attachment Processor Workflow
 *
 * Orchestrates processing of form submission attachments for RAG:
 * 1. Extract text from each file/URL attachment
 * 2. Chunk the text into smaller pieces
 * 3. Generate embeddings and store chunks
 * 4. Mark submission attachments as ready
 */

import { proxyActivities } from "@temporalio/workflow";
import { createWorkflowLogger } from "../core/workflow-logger";
import type * as activities from "../activities";

// ============================================================================
// ACTIVITY PROXIES
// ============================================================================

const {
    extractSubmissionAttachmentText,
    chunkSubmissionAttachmentText,
    generateAndStoreSubmissionChunks,
    completeSubmissionAttachmentProcessing
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "10 minutes",
    retry: {
        initialInterval: "1s",
        backoffCoefficient: 2,
        maximumAttempts: 3,
        maximumInterval: "30s"
    }
});

// ============================================================================
// TYPES
// ============================================================================

export interface FormSubmissionAttachmentInput {
    submissionId: string;
    interfaceId: string;
    files: Array<{
        filename: string;
        gcsPath: string;
        mimeType: string;
        size: number;
    }>;
    urls: Array<{
        url: string;
        title?: string;
    }>;
}

export interface FormSubmissionAttachmentResult {
    submissionId: string;
    success: boolean;
    filesProcessed: number;
    urlsProcessed: number;
    totalChunks: number;
    error?: string;
}

// ============================================================================
// WORKFLOW
// ============================================================================

/**
 * Process form submission attachments for RAG queries
 */
export async function processFormSubmissionAttachmentsWorkflow(
    input: FormSubmissionAttachmentInput
): Promise<FormSubmissionAttachmentResult> {
    const wfLogger = createWorkflowLogger({
        executionId: input.submissionId,
        workflowName: "ProcessFormSubmissionAttachments"
    });

    wfLogger.info("Starting form submission attachment processing", {
        submissionId: input.submissionId,
        fileCount: input.files.length,
        urlCount: input.urls.length
    });

    try {
        let totalChunks = 0;
        let filesProcessed = 0;
        let urlsProcessed = 0;

        // Process each file attachment
        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];

            wfLogger.info("Processing file attachment", {
                filename: file.filename,
                index: i
            });

            try {
                // Extract text from file
                const content = await extractSubmissionAttachmentText({
                    submissionId: input.submissionId,
                    sourceType: "file",
                    sourceName: file.filename,
                    sourceIndex: i,
                    gcsPath: file.gcsPath,
                    mimeType: file.mimeType
                });

                if (content && content.trim().length > 0) {
                    // Chunk the text
                    const chunks = await chunkSubmissionAttachmentText({
                        submissionId: input.submissionId,
                        content,
                        sourceType: "file",
                        sourceName: file.filename,
                        sourceIndex: i
                    });

                    if (chunks.length > 0) {
                        // Generate embeddings and store chunks
                        const { chunkCount } = await generateAndStoreSubmissionChunks({
                            submissionId: input.submissionId,
                            chunks,
                            sourceType: "file",
                            sourceName: file.filename,
                            sourceIndex: i
                        });

                        totalChunks += chunkCount;
                    }
                }

                filesProcessed++;
            } catch (fileError) {
                wfLogger.error(
                    "Failed to process file attachment",
                    fileError instanceof Error ? fileError : new Error(String(fileError)),
                    { filename: file.filename, index: i }
                );
                // Continue processing other attachments
            }
        }

        // Process each URL attachment
        for (let i = 0; i < input.urls.length; i++) {
            const urlItem = input.urls[i];

            wfLogger.info("Processing URL attachment", {
                url: urlItem.url,
                index: i
            });

            try {
                // Extract text from URL
                const content = await extractSubmissionAttachmentText({
                    submissionId: input.submissionId,
                    sourceType: "url",
                    sourceName: urlItem.url,
                    sourceIndex: i,
                    url: urlItem.url
                });

                if (content && content.trim().length > 0) {
                    // Chunk the text
                    const chunks = await chunkSubmissionAttachmentText({
                        submissionId: input.submissionId,
                        content,
                        sourceType: "url",
                        sourceName: urlItem.url,
                        sourceIndex: i
                    });

                    if (chunks.length > 0) {
                        // Generate embeddings and store chunks
                        const { chunkCount } = await generateAndStoreSubmissionChunks({
                            submissionId: input.submissionId,
                            chunks,
                            sourceType: "url",
                            sourceName: urlItem.url,
                            sourceIndex: i
                        });

                        totalChunks += chunkCount;
                    }
                }

                urlsProcessed++;
            } catch (urlError) {
                wfLogger.error(
                    "Failed to process URL attachment",
                    urlError instanceof Error ? urlError : new Error(String(urlError)),
                    { url: urlItem.url, index: i }
                );
                // Continue processing other attachments
            }
        }

        // Mark submission attachments as ready
        await completeSubmissionAttachmentProcessing({
            submissionId: input.submissionId,
            success: true
        });

        wfLogger.info("Successfully processed form submission attachments", {
            submissionId: input.submissionId,
            filesProcessed,
            urlsProcessed,
            totalChunks
        });

        return {
            submissionId: input.submissionId,
            success: true,
            filesProcessed,
            urlsProcessed,
            totalChunks
        };
    } catch (error: unknown) {
        wfLogger.error(
            "Error processing form submission attachments",
            error instanceof Error ? error : new Error(String(error)),
            { submissionId: input.submissionId }
        );

        // Mark as failed
        try {
            await completeSubmissionAttachmentProcessing({
                submissionId: input.submissionId,
                success: false
            });
        } catch {
            // Ignore secondary error
        }

        return {
            submissionId: input.submissionId,
            success: false,
            filesProcessed: 0,
            urlsProcessed: 0,
            totalChunks: 0,
            error:
                error instanceof Error
                    ? error.message
                    : "Unknown error while processing attachments"
        };
    }
}
