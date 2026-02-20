/**
 * Document Adapter Interface
 *
 * Base interface for adapters that normalize provider-specific document operations
 */

import type { ConnectionWithData } from "../../../storage/models/Connection";
import type {
    DocumentCapability,
    IntegrationFile,
    IntegrationBrowseResult,
    IntegrationDownloadResult,
    BrowseOptions
} from "../types";

/**
 * Document adapter interface - normalizes provider-specific operations
 */
export interface DocumentAdapter {
    /** Provider name (e.g., "google-drive", "notion") */
    readonly provider: string;

    /** Detected capabilities for this provider */
    readonly capability: DocumentCapability;

    /**
     * Browse files/folders in the provider
     * @param connection - User's connection with credentials
     * @param options - Browse options (folderId, pageToken, etc.)
     */
    browse(
        connection: ConnectionWithData,
        options: BrowseOptions
    ): Promise<IntegrationBrowseResult>;

    /**
     * Search for files/pages in the provider
     * @param connection - User's connection with credentials
     * @param query - Search query
     * @param options - Additional options
     */
    search(
        connection: ConnectionWithData,
        query: string,
        options?: { pageToken?: string; pageSize?: number }
    ): Promise<IntegrationBrowseResult>;

    /**
     * Download file content from the provider
     * For structured content providers, this converts to markdown
     * @param connection - User's connection with credentials
     * @param fileId - Provider-specific file/page ID
     * @param mimeType - File MIME type
     */
    download(
        connection: ConnectionWithData,
        fileId: string,
        mimeType: string
    ): Promise<IntegrationDownloadResult>;

    /**
     * Get file metadata without downloading content
     * @param connection - User's connection with credentials
     * @param fileId - Provider-specific file/page ID
     */
    getFileInfo(connection: ConnectionWithData, fileId: string): Promise<IntegrationFile | null>;

    /**
     * Build breadcrumb trail for navigation
     * @param connection - User's connection with credentials
     * @param folderId - Current folder ID
     */
    buildBreadcrumbs(
        connection: ConnectionWithData,
        folderId: string
    ): Promise<Array<{ id: string; name: string }>>;
}

/**
 * Abstract base class with shared functionality
 */
export abstract class BaseDocumentAdapter implements DocumentAdapter {
    abstract readonly provider: string;
    abstract readonly capability: DocumentCapability;

    abstract browse(
        connection: ConnectionWithData,
        options: BrowseOptions
    ): Promise<IntegrationBrowseResult>;

    abstract search(
        connection: ConnectionWithData,
        query: string,
        options?: { pageToken?: string; pageSize?: number }
    ): Promise<IntegrationBrowseResult>;

    abstract download(
        connection: ConnectionWithData,
        fileId: string,
        mimeType: string
    ): Promise<IntegrationDownloadResult>;

    abstract getFileInfo(
        connection: ConnectionWithData,
        fileId: string
    ): Promise<IntegrationFile | null>;

    /**
     * Default implementation - returns empty breadcrumbs
     * Override in subclasses for providers that support folder hierarchy
     */
    async buildBreadcrumbs(
        _connection: ConnectionWithData,
        _folderId: string
    ): Promise<Array<{ id: string; name: string }>> {
        return [];
    }

    /**
     * Check if a MIME type is downloadable/importable
     */
    protected isImportableMimeType(mimeType: string): boolean {
        const importable = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "text/markdown",
            "text/html",
            "application/json",
            "text/csv",
            // Google Workspace types that can be exported
            "application/vnd.google-apps.document",
            "application/vnd.google-apps.spreadsheet",
            "application/vnd.google-apps.presentation"
        ];

        return importable.includes(mimeType) || mimeType.startsWith("text/");
    }

    /**
     * Get file extension from MIME type
     */
    protected getExtensionFromMimeType(mimeType: string): string {
        const mimeToExt: Record<string, string> = {
            "application/pdf": "pdf",
            "application/msword": "doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
            "text/plain": "txt",
            "text/markdown": "md",
            "text/html": "html",
            "application/json": "json",
            "text/csv": "csv",
            "application/vnd.google-apps.document": "gdoc",
            "application/vnd.google-apps.spreadsheet": "gsheet",
            "application/vnd.google-apps.presentation": "gslides"
        };

        return mimeToExt[mimeType] || "bin";
    }

    /**
     * Compute a simple hash for change detection
     */
    protected computeHash(content: Buffer): string {
        // Use a simple FNV-1a hash for performance
        let hash = 2166136261;
        for (let i = 0; i < content.length; i++) {
            hash ^= content[i];
            hash = (hash * 16777619) >>> 0;
        }
        return hash.toString(16);
    }
}
