/**
 * Events - Execution event emissions, validation, batching, and document processing activities
 *
 * Activities for emitting orchestration events to WebSocket clients.
 * These are side-effect activities called from the orchestrator workflow.
 *
 * Events are published to Redis so they can be received by the API server
 * process (which hosts WebSocket connections), even though activities run
 * in the Temporal worker process.
 */

import * as fs from "fs/promises";
import { Context } from "@temporalio/activity";
import type { JsonObject, JsonValue, WorkflowDefinition } from "@flowmaestro/shared";
import {
    validateWorkflowInputs,
    validateWorkflowOutputs,
    validateWorkflowContext,
    type ValidatedWorkflowDefinition,
    type WorkflowValidationResult
} from "../../core/validation/workflow-state-validation";
import { EmbeddingService } from "../../services/embeddings/EmbeddingService";
import { TextChunker } from "../../services/embeddings/TextChunker";
import { TextExtractor } from "../../services/embeddings/TextExtractor";
import { globalEventEmitter } from "../../services/events/EventEmitter";
import { redisEventBus } from "../../services/events/RedisEventBus";
import { getGCSStorageService } from "../../services/GCSStorageService";
import { Database } from "../../storage/database";
import { CreateKnowledgeChunkInput } from "../../storage/models/KnowledgeChunk";
import { DocumentFileType } from "../../storage/models/KnowledgeDocument";
import {
    KnowledgeDocumentRepository,
    KnowledgeChunkRepository,
    KnowledgeBaseRepository
} from "../../storage/repositories";
import { ExecutionRepository } from "../../storage/repositories/ExecutionRepository";
import { activityLogger, createActivityLogger } from "../core";

// ============================================================================
// BASE EVENT TYPES
// ============================================================================

export interface EmitExecutionStartedInput {
    executionId: string;
    workflowName: string;
    totalNodes: number;
}

export interface EmitExecutionProgressInput {
    executionId: string;
    completed: number;
    total: number;
    percentage: number;
}

export interface EmitExecutionCompletedInput {
    executionId: string;
    outputs: JsonObject;
    duration: number;
}

export interface EmitExecutionFailedInput {
    executionId: string;
    error: string;
    failedNodeId?: string;
}

export interface EmitExecutionPausedInput {
    executionId: string;
    reason: string;
    pausedAtNodeId: string;
    pausedAtNodeName?: string;
    pauseContext: {
        prompt?: string;
        description?: string;
        variableName: string;
        inputType: "text" | "number" | "boolean" | "json";
        placeholder?: string;
        validation?: JsonObject;
        required?: boolean;
    };
}

export interface EmitNodeStartedInput {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
}

export interface EmitNodeCompletedInput {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    output: JsonValue;
    duration: number;
    metadata?: JsonObject;
}

export interface EmitNodeFailedInput {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    error: string;
}

// ============================================================================
// EXECUTION EVENTS
// ============================================================================

/**
 * Emit execution started event.
 */
export async function emitExecutionStarted(input: EmitExecutionStartedInput): Promise<void> {
    const { executionId, workflowName, totalNodes } = input;

    // Update database status
    const executionRepo = new ExecutionRepository();
    await executionRepo.update(executionId, {
        status: "running",
        started_at: new Date()
    });

    await redisEventBus.publish("workflow:events:execution:started", {
        type: "execution:started",
        timestamp: Date.now(),
        executionId,
        workflowName,
        totalNodes
    });
}

/**
 * Emit execution progress event.
 */
export async function emitExecutionProgress(input: EmitExecutionProgressInput): Promise<void> {
    const { executionId, completed, total, percentage } = input;
    await redisEventBus.publish("workflow:events:execution:progress", {
        type: "execution:progress",
        timestamp: Date.now(),
        executionId,
        completed,
        total,
        percentage
    });
}

/**
 * Emit execution completed event.
 */
export async function emitExecutionCompleted(input: EmitExecutionCompletedInput): Promise<void> {
    const { executionId, outputs, duration } = input;

    // Update database status
    const executionRepo = new ExecutionRepository();
    await executionRepo.update(executionId, {
        status: "completed",
        outputs,
        completed_at: new Date()
    });

    await redisEventBus.publish("workflow:events:execution:completed", {
        type: "execution:completed",
        timestamp: Date.now(),
        executionId,
        status: "completed",
        outputs,
        duration
    });
}

/**
 * Emit execution failed event.
 */
export async function emitExecutionFailed(input: EmitExecutionFailedInput): Promise<void> {
    const { executionId, error, failedNodeId } = input;

    // Update database status
    const executionRepo = new ExecutionRepository();
    await executionRepo.update(executionId, {
        status: "failed",
        error,
        completed_at: new Date()
    });

    await redisEventBus.publish("workflow:events:execution:failed", {
        type: "execution:failed",
        timestamp: Date.now(),
        executionId,
        status: "failed",
        error,
        ...(failedNodeId && { failedNodeId })
    });
}

/**
 * Emit execution paused event for human review.
 */
export async function emitExecutionPaused(input: EmitExecutionPausedInput): Promise<void> {
    const { executionId, reason, pausedAtNodeId, pausedAtNodeName, pauseContext } = input;

    // Update database status and store pause context
    const executionRepo = new ExecutionRepository();
    await executionRepo.update(executionId, {
        status: "paused",
        pause_context: {
            reason,
            nodeId: pausedAtNodeId,
            nodeName: pausedAtNodeName,
            pausedAt: Date.now(),
            resumeTrigger: "manual",
            prompt: pauseContext.prompt,
            description: pauseContext.description,
            variableName: pauseContext.variableName,
            inputType: pauseContext.inputType,
            placeholder: pauseContext.placeholder,
            validation: pauseContext.validation,
            required: pauseContext.required
        }
    });

    await redisEventBus.publish("workflow:events:execution:paused", {
        type: "execution:paused",
        timestamp: Date.now(),
        executionId,
        status: "paused",
        reason,
        pausedAtNodeId,
        ...(pausedAtNodeName && { pausedAtNodeName }),
        pauseContext
    });
}

/**
 * Emit node started event.
 */
export async function emitNodeStarted(input: EmitNodeStartedInput): Promise<void> {
    const { executionId, nodeId, nodeName, nodeType } = input;
    await redisEventBus.publish("workflow:events:node:started", {
        type: "node:started",
        timestamp: Date.now(),
        executionId,
        nodeId,
        nodeName,
        nodeType
    });
}

/**
 * Emit node completed event.
 */
export async function emitNodeCompleted(input: EmitNodeCompletedInput): Promise<void> {
    const { executionId, nodeId, nodeName, nodeType, output, duration, metadata } = input;
    await redisEventBus.publish("workflow:events:node:completed", {
        type: "node:completed",
        timestamp: Date.now(),
        executionId,
        nodeId,
        nodeName,
        nodeType,
        output,
        duration,
        ...(metadata && { metadata })
    });
}

/**
 * Emit node failed event.
 */
export async function emitNodeFailed(input: EmitNodeFailedInput): Promise<void> {
    const { executionId, nodeId, nodeName, nodeType, error } = input;
    await redisEventBus.publish("workflow:events:node:failed", {
        type: "node:failed",
        timestamp: Date.now(),
        executionId,
        nodeId,
        nodeName,
        nodeType,
        error
    });
}

// ============================================================================
// VALIDATION ACTIVITIES
// ============================================================================

/**
 * Validate workflow inputs before execution
 */
export async function validateInputsActivity(params: {
    workflowDefinition: WorkflowDefinition;
    inputs: JsonObject;
}): Promise<WorkflowValidationResult> {
    const { workflowDefinition, inputs } = params;

    activityLogger.info("Validating workflow inputs", {
        workflowName: workflowDefinition.name || "Unnamed Workflow"
    });

    const result = validateWorkflowInputs(
        workflowDefinition as ValidatedWorkflowDefinition,
        inputs
    );

    if (!result.success) {
        activityLogger.error(
            "Input validation failed",
            new Error(result.error?.message || "Unknown error"),
            {
                errors: result.error?.errors
            }
        );
    } else {
        activityLogger.info("Input validation passed");
    }

    return result;
}

/**
 * Validate workflow outputs after execution
 */
export async function validateOutputsActivity(params: {
    workflowDefinition: WorkflowDefinition;
    outputs: JsonObject;
}): Promise<WorkflowValidationResult> {
    const { workflowDefinition, outputs } = params;

    activityLogger.info("Validating workflow outputs", {
        workflowName: workflowDefinition.name || "Unnamed Workflow"
    });

    const result = validateWorkflowOutputs(
        workflowDefinition as ValidatedWorkflowDefinition,
        outputs
    );

    if (!result.success) {
        activityLogger.error(
            "Output validation failed",
            new Error(result.error?.message || "Unknown error"),
            {
                errors: result.error?.errors
            }
        );
    } else {
        activityLogger.info("Output validation passed");
    }

    return result;
}

/**
 * Validate workflow execution context (intermediate state)
 */
export async function validateContextActivity(params: {
    workflowDefinition: WorkflowDefinition;
    context: JsonObject;
    nodeId?: string;
}): Promise<WorkflowValidationResult> {
    const { workflowDefinition, context, nodeId } = params;

    activityLogger.info("Validating workflow context", { nodeId });

    const result = validateWorkflowContext(
        workflowDefinition as ValidatedWorkflowDefinition,
        context
    );

    if (!result.success) {
        activityLogger.error(
            "Context validation failed",
            new Error(result.error?.message || "Unknown error"),
            {
                nodeId,
                errors: result.error?.errors
            }
        );
    } else {
        activityLogger.info("Context validation passed", { nodeId });
    }

    return result;
}

// ============================================================================
// NODE BATCH EXECUTION
// ============================================================================

const nodeBatchLogger = createActivityLogger({ component: "NodeBatchExecution" });

export interface ExecuteNodeBatchInput {
    executionId: string;
    workflowId: string;
    userId: string;
    nodeIds: string[];
}

export interface ExecuteNodeBatchResult {
    completedNodes: string[];
    failedNodes: string[];
}

/**
 * Execute Node Batch Activity
 *
 * Executes a batch of nodes in a long-running task.
 * Sends heartbeats to Temporal to indicate progress.
 */
export async function executeNodeBatch(
    input: ExecuteNodeBatchInput
): Promise<ExecuteNodeBatchResult> {
    const { executionId, workflowId, nodeIds } = input;
    const db = Database.getInstance();
    const executionRepo = new ExecutionRepository();

    const completedNodes: string[] = [];
    const failedNodes: string[] = [];

    try {
        // Get the execution and workflow
        const execution = await executionRepo.findById(executionId);
        if (!execution) {
            throw new Error(`Execution ${executionId} not found`);
        }

        const workflowResult = await db.query("SELECT definition FROM workflows WHERE id = $1", [
            workflowId
        ]);

        if (workflowResult.rows.length === 0) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        const workflow = workflowResult.rows[0].definition as WorkflowDefinition;

        // Execute each node
        for (const nodeId of nodeIds) {
            try {
                // Heartbeat to let Temporal know we're still alive
                Context.current().heartbeat({
                    currentNode: nodeId,
                    completed: completedNodes.length
                });

                nodeBatchLogger.info("Executing node in batch", {
                    executionId,
                    workflowId,
                    nodeId,
                    batchSize: nodeIds.length,
                    completedCount: completedNodes.length
                });

                // Note: This is a simplified version. In production, you'd integrate
                // more directly with the execution context
                const node = workflow.nodes[nodeId];
                if (!node) {
                    throw new Error(`Node ${nodeId} not found in workflow`);
                }

                // Mark as completed (simplified - real implementation would execute the node)
                completedNodes.push(nodeId);

                // Update progress
                await db.query(
                    `
                    INSERT INTO execution_logs (execution_id, level, message, metadata, timestamp)
                    VALUES ($1, $2, $3, $4, NOW())
                    `,
                    [
                        executionId,
                        "info",
                        `Node ${nodeId} completed in batch`,
                        JSON.stringify({ nodeId, batchSize: nodeIds.length })
                    ]
                );
            } catch (error) {
                nodeBatchLogger.error(
                    "Node failed in batch execution",
                    error instanceof Error ? error : new Error(String(error)),
                    {
                        executionId,
                        workflowId,
                        nodeId,
                        batchSize: nodeIds.length
                    }
                );
                failedNodes.push(nodeId);

                await db.query(
                    `
                    INSERT INTO execution_logs (execution_id, level, message, metadata, timestamp)
                    VALUES ($1, $2, $3, $4, NOW())
                    `,
                    [
                        executionId,
                        "error",
                        `Node ${nodeId} failed in batch`,
                        JSON.stringify({
                            nodeId,
                            error: (error as Error).message
                        })
                    ]
                );
            }
        }

        return { completedNodes, failedNodes };
    } catch (error) {
        nodeBatchLogger.error(
            "Batch execution failed",
            error instanceof Error ? error : new Error(String(error)),
            {
                executionId,
                workflowId,
                nodeCount: nodeIds.length,
                completedCount: completedNodes.length,
                failedCount: failedNodes.length
            }
        );
        throw error;
    }
}

// ============================================================================
// DOCUMENT PROCESSING
// ============================================================================

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
    activityLogger.info("Starting text extraction for document", { documentId: input.documentId });

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
            activityLogger.info("Extracting from URL", { sourceUrl: input.sourceUrl });
            try {
                extractedText = await textExtractor.extractFromURL(input.sourceUrl);
                activityLogger.info("Successfully extracted from URL", {
                    characterCount: extractedText.content.length
                });
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                activityLogger.error(
                    "Failed to extract from URL",
                    error instanceof Error ? error : new Error(errorMsg),
                    { sourceUrl: input.sourceUrl }
                );
                throw error;
            }
        } else if (input.filePath) {
            // Check if file path is a GCS URI
            const isGCSUri = input.filePath.startsWith("gs://");

            if (isGCSUri) {
                // Download from GCS to temporary location
                activityLogger.info("Downloading file from GCS", { gcsUri: input.filePath });
                const gcsService = getGCSStorageService();
                tempFilePath = await gcsService.downloadToTemp({ gcsUri: input.filePath });
                activityLogger.info("Downloaded to temp", { tempFilePath });

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

        activityLogger.info("Successfully extracted text", {
            documentId: input.documentId,
            characterCount: sanitizedContent.length
        });

        return sanitizedContent;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        activityLogger.error(
            "Extract text activity error",
            error instanceof Error ? error : new Error(errorMsg),
            { documentId: input.documentId }
        );
        await documentRepository.updateStatus(input.documentId, "failed", errorMsg);

        // Emit document failed event
        globalEventEmitter.emitDocumentFailed(input.knowledgeBaseId, input.documentId, errorMsg);

        throw error;
    } finally {
        // Clean up temporary file if it was created
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
                activityLogger.info("Cleaned up temp file", { tempFilePath });
            } catch (_error: unknown) {
                activityLogger.warn("Failed to delete temp file", { tempFilePath });
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
    activityLogger.info("Starting text chunking for document", { documentId: input.documentId });

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

        activityLogger.info("Created chunks", {
            documentId: input.documentId,
            chunkCount: sanitizedChunks.length
        });

        return sanitizedChunks;
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        activityLogger.error(
            "Chunk text activity error",
            error instanceof Error ? error : new Error(errorMsg),
            { documentId: input.documentId }
        );
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
    activityLogger.info("Processing chunks for embeddings", {
        chunkCount: input.chunks.length,
        documentId: input.documentId
    });

    try {
        // Get KB config for embedding settings
        const kb = await kbRepository.findById(input.knowledgeBaseId);
        if (!kb) {
            throw new Error(`Knowledge base ${input.knowledgeBaseId} not found`);
        }

        // Extract text from chunks
        const texts = input.chunks.map((chunk) => chunk.content);

        // Generate embeddings
        activityLogger.info("Generating embeddings", { documentId: input.documentId });
        const result = await embeddingService.generateEmbeddings(
            texts,
            {
                model: kb.config.embeddingModel,
                provider: kb.config.embeddingProvider,
                dimensions: kb.config.embeddingDimensions
            },
            input.userId
        );

        activityLogger.info("Generated embeddings", {
            documentId: input.documentId,
            embeddingCount: result.embeddings.length,
            tokensUsed: result.usage.total_tokens
        });

        // Store chunks with embeddings immediately
        activityLogger.info("Storing chunks in database", { documentId: input.documentId });
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

        activityLogger.info("Successfully stored chunks", {
            documentId: input.documentId,
            chunkCount: createdChunks.length
        });

        return {
            chunkCount: createdChunks.length,
            totalTokens: result.usage.total_tokens
        };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        activityLogger.error(
            "Generate and store embeddings activity error",
            error instanceof Error ? error : new Error(errorMsg),
            { documentId: input.documentId }
        );
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
    activityLogger.info("Marking document as ready", { documentId: input.documentId });

    try {
        await documentRepository.updateStatus(input.documentId, "ready");
        activityLogger.info("Document marked as ready", { documentId: input.documentId });

        // Get chunk count for the completed document
        const chunks = await chunkRepository.findByDocumentId(input.documentId);

        // Emit document completed event with chunk count
        globalEventEmitter.emitDocumentCompleted(
            input.knowledgeBaseId,
            input.documentId,
            chunks.length
        );
    } catch (error: unknown) {
        activityLogger.error(
            "Complete document processing activity error",
            error instanceof Error ? error : new Error(String(error)),
            { documentId: input.documentId }
        );
        throw error;
    }
}
