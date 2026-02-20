/**
 * Integration Documents Types
 *
 * Types for auto-detecting provider capabilities and importing documents
 * from integration providers into knowledge bases.
 */

import type { JsonValue } from "@flowmaestro/shared";

/**
 * Document capability detection result
 */
export interface DocumentCapability {
    /** Whether the provider supports browsing folders/files */
    supportsBrowsing: boolean;
    /** Whether the provider supports searching files */
    supportsSearch: boolean;
    /** Type of content this provider handles */
    contentType: "binary" | "structured" | "mixed";
    /** Operation ID for listing files (e.g., "listFiles", "search") */
    listOperation?: string;
    /** Operation ID for downloading binary content */
    downloadOperation?: string;
    /** Operation ID for searching files/pages */
    searchOperation?: string;
    /** Operation ID for getting structured content (e.g., "getPage") */
    getContentOperation?: string;
}

/**
 * Standard operations to detect across providers
 * Each provider may use different names for similar operations
 */
export const DOCUMENT_OPERATIONS = {
    /** Operations that list files/folders/pages */
    list: [
        "listFiles",
        "listDriveItems",
        "listItems",
        "listRecords",
        "listPages",
        "listDocuments",
        "listFolders",
        "listObjects", // S3, GCS, Azure Blob
        "listBlobs", // Azure
        "search"
    ],
    /** Operations that download file content */
    download: [
        "downloadFile",
        "getFile",
        "downloadContent",
        "getFileContent",
        "exportDocument",
        "downloadObject", // S3, GCS
        "downloadBlob", // Azure
        "getObject" // S3
    ],
    /** Operations that search content */
    search: ["search", "searchContent", "searchFiles", "searchPages", "query", "queryDatabase"],
    /** Operations that get structured content (pages, documents) */
    getContent: ["getPage", "getDocument", "getRecord", "getBlock", "getPageContent", "getBlocks"]
} as const;

/**
 * Provider categories that typically support document operations
 */
export const DOCUMENT_PROVIDER_CATEGORIES = [
    "file_storage",
    "productivity",
    "developer_tools",
    "documentation"
] as const;

/**
 * File types commonly supported for document import
 */
export const IMPORTABLE_FILE_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "text/html",
    "application/json",
    "text/csv"
] as const;

/**
 * MIME type to file type mapping
 */
export const MIME_TO_FILE_TYPE: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/markdown": "md",
    "text/html": "html",
    "application/json": "json",
    "text/csv": "csv",
    "application/vnd.google-apps.document": "gdoc",
    "application/vnd.google-apps.spreadsheet": "gsheet"
};

/**
 * Provider with detected document capabilities
 */
export interface CapableProvider {
    provider: string;
    displayName: string;
    capability: DocumentCapability;
}

/**
 * User connection with document capabilities
 */
export interface CapableConnection {
    connectionId: string;
    connectionName: string;
    provider: string;
    displayName: string;
    capability: DocumentCapability;
}

/**
 * File/folder item from an integration provider (normalized)
 */
export interface IntegrationFile {
    /** Unique ID within the provider */
    id: string;
    /** Display name */
    name: string;
    /** MIME type (or provider-specific type) */
    mimeType: string;
    /** File size in bytes (null for folders) */
    size: number | null;
    /** Whether this is a folder */
    isFolder: boolean;
    /** Last modified timestamp */
    modifiedTime: string | null;
    /** Full path within the provider (if available) */
    path: string | null;
    /** Whether this file can be downloaded */
    downloadable: boolean;
    /** Parent folder ID (if available) */
    parentId: string | null;
    /** Provider-specific metadata */
    metadata?: Record<string, JsonValue>;
}

/**
 * Result of browsing files in an integration
 */
export interface IntegrationBrowseResult {
    /** List of files/folders */
    files: IntegrationFile[];
    /** Token for fetching next page */
    nextPageToken: string | null;
    /** Breadcrumb path for navigation */
    breadcrumbs: Array<{ id: string; name: string }>;
    /** Total count if known */
    totalCount?: number;
}

/**
 * Options for browsing integration files
 */
export interface BrowseOptions {
    /** Folder ID to browse (null for root) */
    folderId?: string;
    /** Page token for pagination */
    pageToken?: string;
    /** Search query (if supported) */
    query?: string;
    /** Maximum results per page */
    pageSize?: number;
    /** Filter by file types */
    mimeTypes?: string[];
}

/**
 * Download result from an integration
 */
export interface IntegrationDownloadResult {
    /** File content as buffer */
    buffer: Buffer;
    /** Content type (MIME) */
    contentType: string;
    /** Original filename */
    filename: string;
    /** File size in bytes */
    size: number;
    /** Provider-specific file ID */
    fileId: string;
    /** Last modified time */
    modifiedTime: string | null;
    /** Content hash for change detection */
    contentHash?: string;
}

/**
 * Knowledge base integration source configuration
 */
export interface SourceConfig {
    /** For folder source: the folder ID */
    folderId?: string;
    /** For folder source: the folder path (display) */
    folderPath?: string;
    /** For file source: specific file IDs */
    fileIds?: string[];
    /** For search source: the search query */
    searchQuery?: string;
    /** Include subfolders (for folder source) */
    recursive?: boolean;
    /** File type filters */
    mimeTypes?: string[];
}

/**
 * Knowledge base source types
 */
export type KBSourceType = "folder" | "file" | "search";

/**
 * Sync status for integration sources
 */
export type SyncStatus = "pending" | "syncing" | "completed" | "failed";

/**
 * Knowledge base integration source model
 */
export interface KnowledgeBaseSource {
    id: string;
    knowledgeBaseId: string;
    connectionId: string;
    provider: string;
    sourceType: KBSourceType;
    sourceConfig: SourceConfig;
    syncEnabled: boolean;
    syncIntervalMinutes: number;
    lastSyncedAt: string | null;
    syncStatus: SyncStatus;
    syncError: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Input for creating an integration source
 */
export interface CreateKBSourceInput {
    knowledgeBaseId: string;
    connectionId: string;
    provider: string;
    sourceType: KBSourceType;
    sourceConfig: SourceConfig;
    syncEnabled: boolean;
    syncIntervalMinutes?: number;
}

/**
 * Input for updating an integration source
 */
export interface UpdateKBSourceInput {
    syncEnabled?: boolean;
    syncIntervalMinutes?: number;
    sourceConfig?: Partial<SourceConfig>;
}

/**
 * Import job status for individual files
 */
export type ImportFileStatus = "pending" | "processing" | "completed" | "failed" | "skipped";

/**
 * Import action taken on a file
 */
export type ImportFileAction = "created" | "updated" | "unchanged";

/**
 * Import job file result
 */
export interface ImportFileResult {
    fileId: string;
    fileName: string;
    status: ImportFileStatus;
    action?: ImportFileAction;
    documentId?: string;
    error?: string;
    skippedReason?: string;
}

/**
 * Integration import job tracking
 */
export interface IntegrationImportJob {
    jobId: string;
    sourceId: string;
    knowledgeBaseId: string;
    status: "pending" | "running" | "completed" | "failed";
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    newFiles: number;
    updatedFiles: number;
    results: ImportFileResult[];
    startedAt: string;
    completedAt?: string;
    error?: string;
}
