/**
 * Form Submission Storage Adapter
 *
 * Stores document chunks in form_interface_submission_chunks table.
 * Wraps FormInterfaceSubmissionChunkRepository.
 */

import { createServiceLogger } from "../../../core/logging";
import {
    FormInterfaceSubmissionChunkRepository,
    type CreateSubmissionChunkInput
} from "../../../storage/repositories/FormInterfaceSubmissionChunkRepository";
import { FormInterfaceSubmissionRepository } from "../../../storage/repositories/FormInterfaceSubmissionRepository";
import type {
    ChunkStorageAdapter,
    CreateChunkInput,
    StoreChunksResult,
    ChunkConfig,
    EmbeddingConfig
} from "./ChunkStorageAdapter";

const logger = createServiceLogger("FormSubmissionAdapter");

export interface FormSubmissionAdapterConfig {
    submissionId: string;
    sourceType: "file" | "url";
    sourceName: string;
    sourceIndex: number;
}

export class FormSubmissionAdapter implements ChunkStorageAdapter {
    readonly storageTarget = "form-submission" as const;

    private config: FormSubmissionAdapterConfig;
    private chunkRepo: FormInterfaceSubmissionChunkRepository;
    private submissionRepo: FormInterfaceSubmissionRepository;

    constructor(config: FormSubmissionAdapterConfig) {
        this.config = config;
        this.chunkRepo = new FormInterfaceSubmissionChunkRepository();
        this.submissionRepo = new FormInterfaceSubmissionRepository();
    }

    async getChunkConfig(): Promise<ChunkConfig> {
        // Form submissions use fixed chunk settings
        return {
            chunkSize: 1000,
            chunkOverlap: 200
        };
    }

    async getEmbeddingConfig(): Promise<EmbeddingConfig> {
        // Form submissions use default OpenAI embeddings
        return {
            model: "text-embedding-3-small",
            provider: "openai"
        };
    }

    async storeChunks(chunks: CreateChunkInput[]): Promise<StoreChunksResult> {
        logger.info(
            {
                submissionId: this.config.submissionId,
                sourceName: this.config.sourceName,
                chunkCount: chunks.length
            },
            "Storing form submission chunks"
        );

        const chunkInputs: CreateSubmissionChunkInput[] = chunks.map((chunk) => ({
            submissionId: this.config.submissionId,
            sourceType: this.config.sourceType,
            sourceName: this.config.sourceName,
            sourceIndex: this.config.sourceIndex,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            embedding: chunk.embedding,
            metadata: chunk.metadata
        }));

        await this.chunkRepo.createChunks(chunkInputs);

        logger.info(
            {
                submissionId: this.config.submissionId,
                sourceName: this.config.sourceName,
                storedCount: chunkInputs.length
            },
            "Form submission chunks stored"
        );

        return {
            chunkCount: chunkInputs.length,
            totalTokens: chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0)
        };
    }

    async completeProcessing(): Promise<void> {
        logger.info({ submissionId: this.config.submissionId }, "Completing submission processing");
        await this.submissionRepo.updateAttachmentsStatus(this.config.submissionId, "ready");
    }

    async failProcessing(error: string): Promise<void> {
        logger.error(
            { submissionId: this.config.submissionId, error },
            "Submission processing failed"
        );
        await this.submissionRepo.updateAttachmentsStatus(this.config.submissionId, "failed");
    }

    async getChunkCount(): Promise<number> {
        return await this.chunkRepo.countBySubmissionId(this.config.submissionId);
    }
}
