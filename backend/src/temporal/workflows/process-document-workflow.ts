import { proxyActivities } from "@temporalio/workflow";
import type { DocumentFileType } from "../../storage/models/KnowledgeDocument";
import type * as activities from "../activities/process-document";

// Proxy the activities with retry policies
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

export interface ProcessDocumentWorkflowInput {
    documentId: string;
    knowledgeBaseId: string;
    filePath?: string;
    sourceUrl?: string;
    fileType: string;
    userId?: string;
}

export interface ProcessDocumentWorkflowResult {
    documentId: string;
    success: boolean;
    chunkCount: number;
    error?: string;
}

/**
 * Workflow: Process a document and generate embeddings
 *
 * This workflow orchestrates the following steps:
 * 1. Extract text from the document
 * 2. Chunk the text into smaller pieces
 * 3. Generate embeddings and store chunks (combined to avoid payload size limits)
 * 4. Mark the document as ready
 */
export async function processDocumentWorkflow(
    input: ProcessDocumentWorkflowInput
): Promise<ProcessDocumentWorkflowResult> {
    console.log(`[processDocumentWorkflow] Starting processing for document ${input.documentId}`);

    try {
        // Step 1: Extract text from document
        const content = await extractTextActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: input.fileType as DocumentFileType,
            userId: input.userId
        });

        if (!content || content.trim().length === 0) {
            throw new Error("No content extracted from document");
        }

        // Step 2: Chunk the text
        const chunks = await chunkTextActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: input.fileType as DocumentFileType,
            userId: input.userId,
            content
        });

        if (chunks.length === 0) {
            throw new Error("No chunks created from content");
        }

        // Step 3: Generate embeddings and store chunks
        // Combined activity to avoid passing large embedding arrays through workflow
        const { chunkCount, totalTokens } = await generateAndStoreEmbeddingsActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: input.fileType as DocumentFileType,
            userId: input.userId,
            chunks
        });

        console.log(
            `[processDocumentWorkflow] Generated embeddings and stored ${chunkCount} chunks (${totalTokens} tokens)`
        );

        // Step 4: Mark document as ready
        await completeDocumentProcessingActivity({
            documentId: input.documentId,
            knowledgeBaseId: input.knowledgeBaseId,
            filePath: input.filePath,
            sourceUrl: input.sourceUrl,
            fileType: input.fileType as DocumentFileType,
            userId: input.userId
        });

        console.log(
            `[processDocumentWorkflow] Successfully processed document ${input.documentId} with ${chunkCount} chunks`
        );

        return {
            documentId: input.documentId,
            success: true,
            chunkCount
        };
    } catch (error: unknown) {
        console.error("[processDocumentWorkflow] Error processing document:", error);

        return {
            documentId: input.documentId,
            success: false,
            chunkCount: 0,
            error:
                error instanceof Error ? error.message : "Unknown error while processing document"
        };
    }
}
