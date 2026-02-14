/**
 * Document Processing Service
 *
 * Unified document processing with support for multiple storage targets.
 */

export * from "./storage";

import {
    KnowledgeBaseAdapter,
    type KnowledgeBaseAdapterConfig,
    FormSubmissionAdapter,
    type FormSubmissionAdapterConfig,
    ChatInterfaceAdapter,
    type ChatInterfaceAdapterConfig,
    ChunkStorageAdapter
} from "./storage";

/**
 * Storage adapter configuration union type
 */
export type StorageAdapterConfig =
    | ({ storageTarget: "knowledge-base" } & KnowledgeBaseAdapterConfig)
    | ({ storageTarget: "form-submission" } & FormSubmissionAdapterConfig)
    | ({ storageTarget: "chat-interface" } & ChatInterfaceAdapterConfig);

/**
 * Create a storage adapter based on the target type
 */
export function createStorageAdapter(config: StorageAdapterConfig): ChunkStorageAdapter {
    switch (config.storageTarget) {
        case "knowledge-base":
            return new KnowledgeBaseAdapter({
                documentId: config.documentId,
                knowledgeBaseId: config.knowledgeBaseId
            });
        case "form-submission":
            return new FormSubmissionAdapter({
                submissionId: config.submissionId,
                sourceType: config.sourceType,
                sourceName: config.sourceName,
                sourceIndex: config.sourceIndex
            });
        case "chat-interface":
            return new ChatInterfaceAdapter({
                sessionId: config.sessionId,
                threadId: config.threadId,
                sourceType: config.sourceType,
                sourceName: config.sourceName,
                sourceIndex: config.sourceIndex
            });
        default: {
            const _exhaustive: never = config;
            throw new Error(
                `Unknown storage target: ${(_exhaustive as StorageAdapterConfig).storageTarget}`
            );
        }
    }
}
