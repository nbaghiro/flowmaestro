/**
 * Process Document Workflow
 *
 * Orchestrates document processing and embedding generation for multiple storage targets:
 * - knowledge-base: Stores chunks in knowledge_document_chunks
 * - form-submission: Stores chunks in form_interface_submission_chunks
 * - chat-interface: Stores chunks in chat_interface_message_chunks
 *
 * Steps:
 * 1. Extract text from the document(s)
 * 2. Chunk the text into smaller pieces
 * 3. Generate embeddings and store chunks
 * 4. Mark processing as complete
 */

import { proxyActivities } from "@temporalio/workflow";
import { createWorkflowLogger } from "../core/workflow-logger";
import type { DocumentFileType } from "../../storage/models/KnowledgeDocument";
import type * as activities from "../activities";

// ============================================================================
// ACTIVITY PROXIES
// ============================================================================

// Legacy activities (for backward compatibility)
const {
    extractTextActivity,
    chunkTextActivity,
    generateAndStoreEmbeddingsActivity,
    completeDocumentProcessingActivity
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "10 minutes",
    retry: {
        initialInterval: "1s",
        backoffCoefficient: 2,
        maximumAttempts: 3,
        maximumInterval: "30s"
    }
});

// New unified activities
const {
    extractDocumentText,
    chunkDocumentText,
    generateAndStoreChunks,
    completeDocumentProcessing
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

/**
 * Storage target types
 */
export type StorageTarget = "knowledge-base" | "form-submission" | "chat-interface";

/**
 * Document source for processing
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
 * Legacy input format (backward compatible)
 */
export interface ProcessDocumentWorkflowInput {
    // Required for knowledge-base (legacy mode)
    documentId?: string;
    knowledgeBaseId?: string;

    // Legacy fields for single document
    filePath?: string;
    sourceUrl?: string;
    fileType?: string;

    // New multi-target fields
    storageTarget?: StorageTarget;

    // Form submission fields
    submissionId?: string;
    files?: Array<{
        filename: string;
        gcsPath: string;
        mimeType: string;
        size: number;
    }>;
    urls?: Array<{
        url: string;
        title?: string;
    }>;

    // Chat interface fields
    sessionId?: string;
    threadId?: string;
    documents?: DocumentSource[];

    // Common fields
    userId?: string;
}

/**
 * Result for single document processing
 */
export interface DocumentProcessingResult {
    sourceName: string;
    success: boolean;
    chunkCount: number;
    error?: string;
}

/**
 * Workflow result
 */
export interface ProcessDocumentWorkflowResult {
    // Legacy field for single document
    documentId?: string;
    // New multi-document results
    submissionId?: string;
    sessionId?: string;
    success: boolean;
    chunkCount: number;
    documentsProcessed?: number;
    documentResults?: DocumentProcessingResult[];
    error?: string;
}

// ============================================================================
// WORKFLOW
// ============================================================================

/**
 * Process Document Workflow
 *
 * Orchestrates document processing and embedding generation.
 * Supports multiple storage targets and batch document processing.
 */
export async function processDocumentWorkflow(
    input: ProcessDocumentWorkflowInput
): Promise<ProcessDocumentWorkflowResult> {
    // Determine storage target (default to knowledge-base for backward compatibility)
    const storageTarget = input.storageTarget || "knowledge-base";

    // Use legacy flow for knowledge-base when using legacy input format
    if (storageTarget === "knowledge-base" && input.documentId && input.knowledgeBaseId) {
        return processKnowledgeBaseDocument(input);
    }

    // Use new unified flow for other targets or new format
    if (storageTarget === "form-submission" && input.submissionId) {
        return processFormSubmissionDocuments(input);
    }

    if (storageTarget === "chat-interface" && input.sessionId) {
        return processChatInterfaceDocuments(input);
    }

    // Legacy fallback
    if (input.documentId && input.knowledgeBaseId) {
        return processKnowledgeBaseDocument(input);
    }

    throw new Error("Invalid input: missing required identifiers for storage target");
}

/**
 * Process a knowledge base document (legacy flow)
 */
async function processKnowledgeBaseDocument(
    input: ProcessDocumentWorkflowInput
): Promise<ProcessDocumentWorkflowResult> {
    const wfLogger = createWorkflowLogger({
        executionId: input.documentId!,
        workflowName: "ProcessDocument",
        userId: input.userId
    });

    wfLogger.info("Starting document processing", {
        documentId: input.documentId,
        knowledgeBaseId: input.knowledgeBaseId,
        fileType: input.fileType
    });

    try {
        // Step 1: Extract text from document
        const content = await extractTextActivity({
            documentId: input.documentId!,
            knowledgeBaseId: input.knowledgeBaseId!,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: (input.fileType || "txt") as DocumentFileType,
            userId: input.userId
        });

        if (!content || content.trim().length === 0) {
            throw new Error("No content extracted from document");
        }

        // Step 2: Chunk the text
        const chunks = await chunkTextActivity({
            documentId: input.documentId!,
            knowledgeBaseId: input.knowledgeBaseId!,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: (input.fileType || "txt") as DocumentFileType,
            userId: input.userId,
            content
        });

        if (chunks.length === 0) {
            throw new Error("No chunks created from content");
        }

        // Step 3: Generate embeddings and store chunks
        const { chunkCount, totalTokens } = await generateAndStoreEmbeddingsActivity({
            documentId: input.documentId!,
            knowledgeBaseId: input.knowledgeBaseId!,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: (input.fileType || "txt") as DocumentFileType,
            userId: input.userId,
            chunks
        });

        wfLogger.info("Generated embeddings and stored chunks", { chunkCount, totalTokens });

        // Step 4: Mark document as ready
        await completeDocumentProcessingActivity({
            documentId: input.documentId!,
            knowledgeBaseId: input.knowledgeBaseId!,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: (input.fileType || "txt") as DocumentFileType,
            userId: input.userId
        });

        wfLogger.info("Successfully processed document", {
            documentId: input.documentId,
            chunkCount
        });

        return {
            documentId: input.documentId,
            success: true,
            chunkCount
        };
    } catch (error: unknown) {
        wfLogger.error(
            "Error processing document",
            error instanceof Error ? error : new Error(String(error)),
            { documentId: input.documentId }
        );

        return {
            documentId: input.documentId,
            success: false,
            chunkCount: 0,
            error:
                error instanceof Error ? error.message : "Unknown error while processing document"
        };
    }
}

/**
 * Process form submission attachments
 */
async function processFormSubmissionDocuments(
    input: ProcessDocumentWorkflowInput
): Promise<ProcessDocumentWorkflowResult> {
    const wfLogger = createWorkflowLogger({
        executionId: input.submissionId!,
        workflowName: "ProcessFormSubmissionAttachments",
        userId: input.userId
    });

    const files = input.files || [];
    const urls = input.urls || [];

    wfLogger.info("Starting form submission attachment processing", {
        submissionId: input.submissionId,
        fileCount: files.length,
        urlCount: urls.length
    });

    const results: DocumentProcessingResult[] = [];
    let totalChunks = 0;

    try {
        // Process files
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            wfLogger.info("Processing file attachment", { filename: file.filename, index: i });

            const result = await processDocument(
                "form-submission",
                {
                    type: "file",
                    gcsPath: file.gcsPath,
                    mimeType: file.mimeType,
                    filename: file.filename
                },
                {
                    submissionId: input.submissionId!,
                    sourceIndex: i,
                    userId: input.userId
                }
            );

            results.push({ sourceName: file.filename, ...result });
            if (result.success) {
                totalChunks += result.chunkCount;
            }
        }

        // Process URLs
        for (let i = 0; i < urls.length; i++) {
            const urlItem = urls[i];
            wfLogger.info("Processing URL attachment", { url: urlItem.url, index: i });

            const result = await processDocument(
                "form-submission",
                {
                    type: "url",
                    url: urlItem.url,
                    filename: urlItem.title || urlItem.url
                },
                {
                    submissionId: input.submissionId!,
                    sourceIndex: files.length + i,
                    userId: input.userId
                }
            );

            results.push({ sourceName: urlItem.url, ...result });
            if (result.success) {
                totalChunks += result.chunkCount;
            }
        }

        // Mark submission as complete
        await completeDocumentProcessing({
            storageTarget: "form-submission",
            submissionId: input.submissionId,
            success: true
        });

        const successCount = results.filter((r) => r.success).length;
        wfLogger.info("Form submission processing completed", {
            submissionId: input.submissionId,
            documentsProcessed: results.length,
            successCount,
            totalChunks
        });

        return {
            submissionId: input.submissionId,
            success: successCount > 0,
            chunkCount: totalChunks,
            documentsProcessed: results.length,
            documentResults: results
        };
    } catch (error: unknown) {
        wfLogger.error(
            "Error processing form submission attachments",
            error instanceof Error ? error : new Error(String(error)),
            { submissionId: input.submissionId }
        );

        // Mark as failed
        try {
            await completeDocumentProcessing({
                storageTarget: "form-submission",
                submissionId: input.submissionId,
                success: false
            });
        } catch {
            // Ignore secondary error
        }

        return {
            submissionId: input.submissionId,
            success: false,
            chunkCount: 0,
            documentsProcessed: 0,
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}

/**
 * Process chat interface attachments
 */
async function processChatInterfaceDocuments(
    input: ProcessDocumentWorkflowInput
): Promise<ProcessDocumentWorkflowResult> {
    const wfLogger = createWorkflowLogger({
        executionId: input.sessionId!,
        workflowName: "ProcessChatAttachments",
        userId: input.userId
    });

    const documents = input.documents || [];

    wfLogger.info("Starting chat interface attachment processing", {
        sessionId: input.sessionId,
        documentCount: documents.length
    });

    const results: DocumentProcessingResult[] = [];
    let totalChunks = 0;

    try {
        // Process each document
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            const sourceName = doc.filename || doc.url || `document-${i}`;

            wfLogger.info("Processing chat attachment", { sourceName, index: i });

            const result = await processDocument("chat-interface", doc, {
                sessionId: input.sessionId!,
                threadId: input.threadId,
                sourceIndex: i,
                userId: input.userId
            });

            results.push({ sourceName, ...result });
            if (result.success) {
                totalChunks += result.chunkCount;
            }
        }

        // Mark session processing as complete
        await completeDocumentProcessing({
            storageTarget: "chat-interface",
            sessionId: input.sessionId,
            success: true
        });

        const successCount = results.filter((r) => r.success).length;
        wfLogger.info("Chat interface processing completed", {
            sessionId: input.sessionId,
            documentsProcessed: results.length,
            successCount,
            totalChunks
        });

        return {
            sessionId: input.sessionId,
            success: successCount > 0,
            chunkCount: totalChunks,
            documentsProcessed: results.length,
            documentResults: results
        };
    } catch (error: unknown) {
        wfLogger.error(
            "Error processing chat interface attachments",
            error instanceof Error ? error : new Error(String(error)),
            { sessionId: input.sessionId }
        );

        // Mark as failed
        try {
            await completeDocumentProcessing({
                storageTarget: "chat-interface",
                sessionId: input.sessionId,
                success: false
            });
        } catch {
            // Ignore secondary error
        }

        return {
            sessionId: input.sessionId,
            success: false,
            chunkCount: 0,
            documentsProcessed: 0,
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}

/**
 * Process a single document using unified activities
 */
async function processDocument(
    storageTarget: StorageTarget,
    doc: DocumentSource,
    context: {
        submissionId?: string;
        sessionId?: string;
        threadId?: string;
        sourceIndex: number;
        userId?: string;
    }
): Promise<{ success: boolean; chunkCount: number; error?: string }> {
    const sourceType = doc.type;
    const sourceName = doc.filename || doc.url || "unknown";

    try {
        // Extract text
        const content = await extractDocumentText({
            storageTarget,
            sourceType,
            sourceName,
            sourceIndex: context.sourceIndex,
            gcsPath: doc.gcsPath,
            filePath: doc.filePath,
            mimeType: doc.mimeType,
            url: doc.url,
            submissionId: context.submissionId,
            sessionId: context.sessionId,
            threadId: context.threadId,
            userId: context.userId
        });

        if (!content || content.trim().length === 0) {
            return { success: true, chunkCount: 0, error: "No content extracted" };
        }

        // Chunk text
        const chunks = await chunkDocumentText({
            storageTarget,
            content,
            sourceType,
            sourceName,
            sourceIndex: context.sourceIndex,
            submissionId: context.submissionId,
            sessionId: context.sessionId,
            userId: context.userId
        });

        if (chunks.length === 0) {
            return { success: true, chunkCount: 0, error: "No chunks created" };
        }

        // Generate embeddings and store
        const { chunkCount } = await generateAndStoreChunks({
            storageTarget,
            chunks,
            sourceType,
            sourceName,
            sourceIndex: context.sourceIndex,
            submissionId: context.submissionId,
            sessionId: context.sessionId,
            threadId: context.threadId,
            userId: context.userId
        });

        return { success: true, chunkCount };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { success: false, chunkCount: 0, error: errorMsg };
    }
}
