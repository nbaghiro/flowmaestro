/**
 * Integration Import Activities
 *
 * Activities for importing documents from integration providers
 */

import { createServiceLogger } from "../../../core/logging";
import { GCSStorageService } from "../../../services/GCSStorageService";
import { integrationDocumentService } from "../../../services/integration-documents";
import { KnowledgeBaseSourceRepository } from "../../../storage/repositories/KnowledgeBaseSourceRepository";
import { KnowledgeDocumentRepository } from "../../../storage/repositories/KnowledgeDocumentRepository";
import type {
    IntegrationFile,
    SourceConfig,
    SyncStatus
} from "../../../services/integration-documents/types";
import type { DocumentFileType, DocumentMetadata } from "../../../storage/models/KnowledgeDocument";

const logger = createServiceLogger("IntegrationImportActivities");

// ============================================================================
// TYPES
// ============================================================================

export interface ListIntegrationFilesInput {
    connectionId: string;
    provider: string;
    sourceConfig: SourceConfig;
}

export interface CheckExistingDocumentsInput {
    knowledgeBaseId: string;
    fileIds: string[];
}

export interface ExistingDocumentInfo {
    documentId: string;
    integrationFileId: string;
    lastModified: string | null;
    contentHash: string | null;
}

export interface DownloadIntegrationFileInput {
    connectionId: string;
    provider: string;
    fileId: string;
    mimeType: string;
}

export interface DownloadResult {
    buffer: string; // Base64 encoded
    contentType: string;
    filename: string;
    size: number;
    fileType: DocumentFileType;
    contentHash: string;
}

export interface StoreDocumentFileInput {
    knowledgeBaseId: string;
    fileName: string;
    content: string; // Base64 encoded
    contentType: string;
}

export interface CreateIntegrationDocumentInput {
    knowledgeBaseId: string;
    sourceId: string;
    name: string;
    filePath: string;
    fileType: DocumentFileType;
    fileSize: number;
    metadata: DocumentMetadata;
    existingDocumentId?: string;
}

export interface UpdateSourceSyncStatusInput {
    sourceId: string;
    status: SyncStatus;
    error?: string;
}

// ============================================================================
// ACTIVITIES
// ============================================================================

/**
 * List files from an integration source
 */
export async function listIntegrationFiles(
    input: ListIntegrationFilesInput
): Promise<IntegrationFile[]> {
    logger.info(
        { connectionId: input.connectionId, provider: input.provider },
        "Listing integration files"
    );

    const files: IntegrationFile[] = [];
    const { sourceConfig } = input;

    // Handle different source types
    if (sourceConfig.fileIds && sourceConfig.fileIds.length > 0) {
        // Specific file IDs
        for (const fileId of sourceConfig.fileIds) {
            const fileInfo = await integrationDocumentService.getFileInfo(
                input.connectionId,
                fileId
            );
            if (fileInfo) {
                files.push(fileInfo);
            }
        }
    } else if (sourceConfig.searchQuery) {
        // Search query
        const result = await integrationDocumentService.searchConnection(
            input.connectionId,
            sourceConfig.searchQuery,
            { pageSize: 100 }
        );
        files.push(...result.files.filter((f) => !f.isFolder && f.downloadable));
    } else if (sourceConfig.folderId || !sourceConfig.searchQuery) {
        // Folder or root
        const allFiles = await integrationDocumentService.listSourceFiles(input.connectionId, {
            folderId: sourceConfig.folderId,
            recursive: sourceConfig.recursive
        });
        files.push(...allFiles);
    }

    // Filter by mime types if specified
    if (sourceConfig.mimeTypes && sourceConfig.mimeTypes.length > 0) {
        return files.filter((f) => sourceConfig.mimeTypes!.includes(f.mimeType));
    }

    logger.info({ fileCount: files.length }, "Found files in integration");
    return files;
}

/**
 * Check which files already exist in the knowledge base
 */
export async function checkExistingDocuments(
    input: CheckExistingDocumentsInput
): Promise<ExistingDocumentInfo[]> {
    logger.info(
        { knowledgeBaseId: input.knowledgeBaseId, fileCount: input.fileIds.length },
        "Checking existing documents"
    );

    const docRepository = new KnowledgeDocumentRepository();
    const existing: ExistingDocumentInfo[] = [];

    for (const fileId of input.fileIds) {
        const doc = await docRepository.findByIntegrationFileId(input.knowledgeBaseId, fileId);
        if (doc) {
            existing.push({
                documentId: doc.id,
                integrationFileId: fileId,
                lastModified: doc.metadata.integration_last_modified || null,
                contentHash: doc.metadata.integration_content_hash || null
            });
        }
    }

    logger.info({ existingCount: existing.length }, "Found existing documents");
    return existing;
}

/**
 * Download a file from an integration provider
 */
export async function downloadIntegrationFile(
    input: DownloadIntegrationFileInput
): Promise<DownloadResult> {
    logger.info(
        { connectionId: input.connectionId, fileId: input.fileId },
        "Downloading integration file"
    );

    const result = await integrationDocumentService.downloadFile(
        input.connectionId,
        input.fileId,
        input.mimeType
    );

    // Determine file type from content type
    const fileType = mapContentTypeToFileType(result.contentType);

    return {
        buffer: result.buffer.toString("base64"),
        contentType: result.contentType,
        filename: result.filename,
        size: result.size,
        fileType,
        contentHash: result.contentHash || ""
    };
}

/**
 * Store a document file in GCS
 */
export async function storeDocumentFile(input: StoreDocumentFileInput): Promise<string> {
    logger.info(
        { knowledgeBaseId: input.knowledgeBaseId, fileName: input.fileName },
        "Storing document file"
    );

    const gcs = new GCSStorageService();
    const buffer = Buffer.from(input.content, "base64");

    // Generate a unique path
    const timestamp = Date.now();
    const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `knowledge-bases/${input.knowledgeBaseId}/documents/${timestamp}_${sanitizedName}`;

    // Upload to GCS
    const gcsUri = await gcs.uploadBuffer(buffer, {
        fileName: path,
        contentType: input.contentType
    });

    logger.info({ gcsUri }, "Stored document in GCS");
    return gcsUri;
}

/**
 * Create or update an integration document record
 */
export async function createIntegrationDocument(
    input: CreateIntegrationDocumentInput
): Promise<string> {
    const docRepository = new KnowledgeDocumentRepository();

    if (input.existingDocumentId) {
        // Update existing document
        logger.info({ documentId: input.existingDocumentId }, "Updating existing document");

        await docRepository.update(input.existingDocumentId, {
            name: input.name,
            metadata: input.metadata,
            status: "pending"
        });

        return input.existingDocumentId;
    } else {
        // Create new document
        logger.info(
            { knowledgeBaseId: input.knowledgeBaseId, name: input.name },
            "Creating new document"
        );

        const doc = await docRepository.create({
            knowledge_base_id: input.knowledgeBaseId,
            name: input.name,
            source_type: "integration",
            file_path: input.filePath,
            file_type: input.fileType,
            file_size: BigInt(input.fileSize),
            metadata: input.metadata,
            source_id: input.sourceId
        });

        return doc.id;
    }
}

/**
 * Update source sync status
 */
export async function updateSourceSyncStatus(input: UpdateSourceSyncStatusInput): Promise<void> {
    logger.info({ sourceId: input.sourceId, status: input.status }, "Updating source sync status");

    const sourceRepository = new KnowledgeBaseSourceRepository();
    await sourceRepository.updateSyncStatus(input.sourceId, input.status, input.error);
}

/**
 * Find sources that are due for sync
 */
export interface SourceDueForSync {
    id: string;
    knowledgeBaseId: string;
    connectionId: string;
    provider: string;
    sourceConfig: SourceConfig;
}

export async function findSourcesDueForSync(limit: number): Promise<SourceDueForSync[]> {
    logger.info({ limit }, "Finding sources due for sync");

    const sourceRepository = new KnowledgeBaseSourceRepository();
    const sources = await sourceRepository.findDueForSync(limit);

    return sources.map((s) => ({
        id: s.id,
        knowledgeBaseId: s.knowledgeBaseId,
        connectionId: s.connectionId,
        provider: s.provider,
        sourceConfig: s.sourceConfig
    }));
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map content type to document file type
 */
function mapContentTypeToFileType(contentType: string): DocumentFileType {
    const mapping: Record<string, DocumentFileType> = {
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "text/plain": "txt",
        "text/markdown": "md",
        "text/html": "html",
        "application/json": "json",
        "text/csv": "csv"
    };

    // Check exact match
    if (mapping[contentType]) {
        return mapping[contentType];
    }

    // Check prefix matches
    if (contentType.startsWith("text/")) {
        return "txt";
    }

    // Default to txt
    return "txt";
}
