/**
 * Integration Import Workflow
 *
 * Orchestrates importing documents from integration providers into knowledge bases.
 * Supports initial import and continuous sync.
 *
 * Steps:
 * 1. List files from the source (folder, specific files, or search)
 * 2. Check which files are new or modified
 * 3. Download and store new/modified files
 * 4. Process documents (extract, chunk, embed)
 * 5. Update sync status
 */

import { proxyActivities } from "@temporalio/workflow";
import { createWorkflowLogger } from "../core/workflow-logger";
import type * as documentActivities from "../activities/document-processing";
import type * as integrationActivities from "../activities/integration-import";

// ============================================================================
// ACTIVITY PROXIES
// ============================================================================

const {
    listIntegrationFiles,
    checkExistingDocuments,
    downloadIntegrationFile,
    storeDocumentFile,
    updateSourceSyncStatus,
    createIntegrationDocument
} = proxyActivities<typeof integrationActivities>({
    startToCloseTimeout: "10 minutes",
    retry: {
        initialInterval: "2s",
        backoffCoefficient: 2,
        maximumAttempts: 3,
        maximumInterval: "60s"
    }
});

const {
    extractDocumentText,
    chunkDocumentText,
    generateAndStoreChunks,
    completeDocumentProcessing
} = proxyActivities<typeof documentActivities>({
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

export interface IntegrationImportWorkflowInput {
    sourceId: string;
    knowledgeBaseId: string;
    connectionId: string;
    provider: string;
    sourceConfig: {
        folderId?: string;
        folderPath?: string;
        fileIds?: string[];
        searchQuery?: string;
        recursive?: boolean;
        mimeTypes?: string[];
    };
    isInitialImport: boolean;
}

export interface ImportFileResult {
    fileId: string;
    fileName: string;
    status: "pending" | "processing" | "completed" | "failed" | "skipped";
    action?: "created" | "updated" | "unchanged";
    documentId?: string;
    error?: string;
    skippedReason?: string;
}

export interface IntegrationImportWorkflowResult {
    sourceId: string;
    knowledgeBaseId: string;
    status: "completed" | "failed";
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    newFiles: number;
    updatedFiles: number;
    results: ImportFileResult[];
    error?: string;
}

// ============================================================================
// WORKFLOW
// ============================================================================

export async function integrationImportWorkflow(
    input: IntegrationImportWorkflowInput
): Promise<IntegrationImportWorkflowResult> {
    const wfLogger = createWorkflowLogger({
        executionId: input.sourceId,
        workflowName: "IntegrationImport",
        userId: undefined
    });

    wfLogger.info("Starting integration import", {
        sourceId: input.sourceId,
        knowledgeBaseId: input.knowledgeBaseId,
        provider: input.provider,
        isInitialImport: input.isInitialImport
    });

    const results: ImportFileResult[] = [];
    let newFiles = 0;
    let updatedFiles = 0;
    let completedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
        // Step 1: List files from the integration source
        wfLogger.info("Listing files from integration");
        const files = await listIntegrationFiles({
            connectionId: input.connectionId,
            provider: input.provider,
            sourceConfig: input.sourceConfig
        });

        wfLogger.info("Found files to process", { fileCount: files.length });

        // Step 2: Check which files already exist in the knowledge base
        const existingDocs = await checkExistingDocuments({
            knowledgeBaseId: input.knowledgeBaseId,
            fileIds: files.map((f) => f.id)
        });

        // Step 3: Process each file
        for (const file of files) {
            const result: ImportFileResult = {
                fileId: file.id,
                fileName: file.name,
                status: "pending"
            };

            try {
                // Check if file is downloadable
                if (!file.downloadable) {
                    result.status = "skipped";
                    result.skippedReason = "File type not supported";
                    skippedCount++;
                    results.push(result);
                    continue;
                }

                // Check if already exists and unchanged
                const existingDoc = existingDocs.find((d) => d.integrationFileId === file.id);
                if (existingDoc) {
                    // Check if file was modified
                    if (
                        file.modifiedTime &&
                        existingDoc.lastModified &&
                        new Date(file.modifiedTime) <= new Date(existingDoc.lastModified)
                    ) {
                        result.status = "skipped";
                        result.action = "unchanged";
                        result.documentId = existingDoc.documentId;
                        result.skippedReason = "File unchanged";
                        skippedCount++;
                        results.push(result);
                        continue;
                    }
                }

                result.status = "processing";

                // Step 3a: Download file from provider
                wfLogger.info("Downloading file", { fileId: file.id, fileName: file.name });
                const downloadResult = await downloadIntegrationFile({
                    connectionId: input.connectionId,
                    provider: input.provider,
                    fileId: file.id,
                    mimeType: file.mimeType
                });

                // Step 3b: Store file in GCS
                const gcsPath = await storeDocumentFile({
                    knowledgeBaseId: input.knowledgeBaseId,
                    fileName: downloadResult.filename,
                    content: downloadResult.buffer,
                    contentType: downloadResult.contentType
                });

                // Step 3c: Create or update document record
                const documentId = await createIntegrationDocument({
                    knowledgeBaseId: input.knowledgeBaseId,
                    sourceId: input.sourceId,
                    name: file.name,
                    filePath: gcsPath,
                    fileType: downloadResult.fileType,
                    fileSize: downloadResult.size,
                    metadata: {
                        integration_source_id: input.sourceId,
                        integration_connection_id: input.connectionId,
                        integration_provider: input.provider,
                        integration_file_id: file.id,
                        integration_file_path: file.path || undefined,
                        integration_last_modified: file.modifiedTime || undefined,
                        integration_content_hash: downloadResult.contentHash
                    },
                    existingDocumentId: existingDoc?.documentId
                });

                result.documentId = documentId;
                result.action = existingDoc ? "updated" : "created";

                // Step 3d: Process document (extract, chunk, embed)
                wfLogger.info("Processing document", { documentId, fileName: file.name });

                // Extract text
                const content = await extractDocumentText({
                    storageTarget: "knowledge-base",
                    sourceType: "file",
                    sourceName: file.name,
                    sourceIndex: 0,
                    gcsPath,
                    mimeType: downloadResult.contentType,
                    documentId,
                    knowledgeBaseId: input.knowledgeBaseId
                });

                if (content && content.trim().length > 0) {
                    // Chunk text
                    const chunks = await chunkDocumentText({
                        storageTarget: "knowledge-base",
                        content,
                        sourceType: "file",
                        sourceName: file.name,
                        sourceIndex: 0,
                        documentId,
                        knowledgeBaseId: input.knowledgeBaseId
                    });

                    if (chunks.length > 0) {
                        // Generate embeddings and store
                        await generateAndStoreChunks({
                            storageTarget: "knowledge-base",
                            chunks,
                            sourceType: "file",
                            sourceName: file.name,
                            sourceIndex: 0,
                            documentId,
                            knowledgeBaseId: input.knowledgeBaseId
                        });
                    }
                }

                // Complete document processing
                await completeDocumentProcessing({
                    storageTarget: "knowledge-base",
                    documentId,
                    knowledgeBaseId: input.knowledgeBaseId,
                    success: true
                });

                result.status = "completed";
                completedCount++;

                if (existingDoc) {
                    updatedFiles++;
                } else {
                    newFiles++;
                }
            } catch (error) {
                result.status = "failed";
                result.error = error instanceof Error ? error.message : "Unknown error";
                failedCount++;

                wfLogger.error("Failed to process file", error as Error, {
                    fileId: file.id,
                    fileName: file.name
                });
            }

            results.push(result);
        }

        // Step 4: Update source sync status
        await updateSourceSyncStatus({
            sourceId: input.sourceId,
            status: failedCount === files.length ? "failed" : "completed",
            error: failedCount > 0 ? `${failedCount} files failed to import` : undefined
        });

        wfLogger.info("Integration import completed", {
            sourceId: input.sourceId,
            total: files.length,
            completed: completedCount,
            failed: failedCount,
            skipped: skippedCount,
            newFiles,
            updatedFiles
        });

        return {
            sourceId: input.sourceId,
            knowledgeBaseId: input.knowledgeBaseId,
            status: "completed",
            total: files.length,
            completed: completedCount,
            failed: failedCount,
            skipped: skippedCount,
            newFiles,
            updatedFiles,
            results
        };
    } catch (error) {
        wfLogger.error("Integration import failed", error as Error, {
            sourceId: input.sourceId
        });

        // Update source sync status to failed
        try {
            await updateSourceSyncStatus({
                sourceId: input.sourceId,
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error"
            });
        } catch {
            // Ignore secondary error
        }

        return {
            sourceId: input.sourceId,
            knowledgeBaseId: input.knowledgeBaseId,
            status: "failed",
            total: 0,
            completed: completedCount,
            failed: failedCount,
            skipped: skippedCount,
            newFiles,
            updatedFiles,
            results,
            error: error instanceof Error ? error.message : "Unknown error"
        };
    }
}
