/**
 * Knowledge Base Integration Types
 *
 * Shared types for knowledge base integration with external providers
 */

/**
 * Provider capability for document import (detected dynamically)
 */
export interface DocumentProviderCapability {
    provider: string;
    displayName: string;
    connectionId: string;
    connectionName: string;
    supportsBrowsing: boolean;
    supportsSearch: boolean;
    contentType: "binary" | "structured" | "mixed";
}

/**
 * File/folder item from an integration provider
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
    /** Last modified timestamp (ISO string) */
    modifiedTime: string | null;
    /** Full path within the provider (if available) */
    path: string | null;
    /** Whether this file can be downloaded/imported */
    downloadable: boolean;
    /** Parent folder ID (if available) */
    parentId: string | null;
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
 * Source configuration for different source types
 */
export interface KBSourceConfig {
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
    /** File type filters (MIME types) */
    mimeTypes?: string[];
}

/**
 * Knowledge base source types
 */
export type KBSourceType = "folder" | "file" | "search";

/**
 * Sync status for integration sources
 */
export type KBSyncStatus = "pending" | "syncing" | "completed" | "failed";

/**
 * Knowledge base integration source
 */
export interface KnowledgeBaseSource {
    id: string;
    knowledgeBaseId: string;
    connectionId: string;
    provider: string;
    sourceType: KBSourceType;
    sourceConfig: KBSourceConfig;
    syncEnabled: boolean;
    syncIntervalMinutes: number;
    lastSyncedAt: string | null;
    syncStatus: KBSyncStatus;
    syncError: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Input for creating an integration source
 */
export interface CreateKBSourceInput {
    connectionId: string;
    sourceType: KBSourceType;
    sourceConfig: KBSourceConfig;
    syncEnabled: boolean;
    syncIntervalMinutes?: number;
}

/**
 * Input for updating an integration source
 */
export interface UpdateKBSourceInput {
    syncEnabled?: boolean;
    syncIntervalMinutes?: number;
}

/**
 * Import job file status
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
 * Integration import job status
 */
export type ImportJobStatus = "pending" | "running" | "completed" | "failed";

/**
 * Integration import job tracking
 */
export interface IntegrationImportJob {
    jobId: string;
    sourceId: string;
    knowledgeBaseId: string;
    status: ImportJobStatus;
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

/**
 * Options for browsing integration files
 */
export interface BrowseIntegrationOptions {
    /** Folder ID to browse (null for root) */
    folderId?: string;
    /** Page token for pagination */
    pageToken?: string;
    /** Search query (if supported) */
    query?: string;
    /** Maximum results per page */
    pageSize?: number;
}

/**
 * Response from creating an integration source
 */
export interface CreateSourceResponse {
    sourceId: string;
    jobId: string;
}

/**
 * Response from triggering a sync
 */
export interface TriggerSyncResponse {
    jobId: string;
}
