/**
 * Complete Processing Activity
 *
 * Marks document processing as complete or failed.
 */

import { createServiceLogger } from "../../../core/logging";
import {
    createStorageAdapter,
    type StorageAdapterConfig
} from "../../../services/document-processing";
import type { CompleteProcessingInput } from "./types";

const logger = createServiceLogger("CompleteProcessingActivity");

/**
 * Build adapter config from input
 */
function buildAdapterConfig(input: CompleteProcessingInput): StorageAdapterConfig {
    switch (input.storageTarget) {
        case "knowledge-base":
            return {
                storageTarget: "knowledge-base",
                documentId: input.documentId!,
                knowledgeBaseId: input.knowledgeBaseId!
            };
        case "form-submission":
            return {
                storageTarget: "form-submission",
                submissionId: input.submissionId!,
                // These are not used for completion but required by adapter
                sourceType: "file",
                sourceName: "unknown",
                sourceIndex: 0
            };
        case "chat-interface":
            return {
                storageTarget: "chat-interface",
                sessionId: input.sessionId!,
                // These are not used for completion but required by adapter
                sourceType: "file",
                sourceName: "unknown",
                sourceIndex: 0
            };
        default:
            throw new Error(`Unknown storage target: ${input.storageTarget}`);
    }
}

/**
 * Mark document processing as complete
 */
export async function completeDocumentProcessing(input: CompleteProcessingInput): Promise<void> {
    logger.info(
        {
            storageTarget: input.storageTarget,
            documentId: input.documentId,
            submissionId: input.submissionId,
            sessionId: input.sessionId,
            success: input.success
        },
        "Completing document processing"
    );

    try {
        const adapterConfig = buildAdapterConfig(input);
        const adapter = createStorageAdapter(adapterConfig);

        if (input.success) {
            await adapter.completeProcessing();
            logger.info({ storageTarget: input.storageTarget }, "Processing marked as complete");
        } else {
            await adapter.failProcessing("Processing failed");
            logger.info({ storageTarget: input.storageTarget }, "Processing marked as failed");
        }
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMsg }, "Failed to complete processing status update");
        throw error;
    }
}
