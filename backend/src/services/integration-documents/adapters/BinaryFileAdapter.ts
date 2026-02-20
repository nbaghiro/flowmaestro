/**
 * Binary File Adapter
 *
 * Generic adapter for file-based providers like Google Drive, Dropbox, Box.
 * Handles binary file download and folder browsing.
 */

import { createServiceLogger } from "../../../core/logging";
import { providerRegistry } from "../../../integrations/registry";
import { BaseDocumentAdapter } from "./DocumentAdapter";
import type { IProvider, OperationResult } from "../../../integrations/core/types";
import type { ConnectionWithData } from "../../../storage/models/Connection";
import type {
    DocumentCapability,
    IntegrationFile,
    IntegrationBrowseResult,
    IntegrationDownloadResult,
    BrowseOptions
} from "../types";

const logger = createServiceLogger("BinaryFileAdapter");

/**
 * Adapter for binary file providers (Google Drive, Dropbox, Box, etc.)
 */
export class BinaryFileAdapter extends BaseDocumentAdapter {
    readonly provider: string;
    readonly capability: DocumentCapability;

    private providerInstance: IProvider;

    constructor(provider: IProvider, capability: DocumentCapability) {
        super();
        this.provider = provider.name;
        this.capability = capability;
        this.providerInstance = provider;
    }

    /**
     * Browse files in a folder
     */
    async browse(
        connection: ConnectionWithData,
        options: BrowseOptions
    ): Promise<IntegrationBrowseResult> {
        if (!this.capability.listOperation) {
            throw new Error(`Provider ${this.provider} does not support file listing`);
        }

        const params: Record<string, unknown> = {};

        // Build query for folder contents
        if (options.folderId) {
            // Different providers use different parameter names
            if (this.provider === "google-drive") {
                params.query = `'${options.folderId}' in parents and trashed=false`;
            } else if (this.provider === "dropbox") {
                params.path = options.folderId === "root" ? "" : options.folderId;
            } else {
                params.folderId = options.folderId;
            }
        } else {
            // Root folder
            if (this.provider === "google-drive") {
                params.query = "'root' in parents and trashed=false";
            } else if (this.provider === "dropbox") {
                params.path = "";
            }
        }

        if (options.pageToken) {
            params.pageToken = options.pageToken;
        }

        if (options.pageSize) {
            params.pageSize = options.pageSize;
        }

        const result = await this.providerInstance.executeOperation(
            this.capability.listOperation,
            params,
            connection,
            { mode: "workflow", workflowId: "integration-import", nodeId: "browse" }
        );

        if (!result.success) {
            throw new Error(result.error?.message || "Failed to list files");
        }

        // Normalize the response
        const files = this.normalizeFileList(result);
        const nextPageToken = this.extractNextPageToken(result);

        // Build breadcrumbs if folderId is provided
        let breadcrumbs: Array<{ id: string; name: string }> = [];
        if (options.folderId && options.folderId !== "root") {
            breadcrumbs = await this.buildBreadcrumbs(connection, options.folderId);
        }

        return {
            files,
            nextPageToken,
            breadcrumbs
        };
    }

    /**
     * Search for files
     */
    async search(
        connection: ConnectionWithData,
        query: string,
        options?: { pageToken?: string; pageSize?: number }
    ): Promise<IntegrationBrowseResult> {
        const searchOp = this.capability.searchOperation || this.capability.listOperation;
        if (!searchOp) {
            throw new Error(`Provider ${this.provider} does not support search`);
        }

        const params: Record<string, unknown> = {};

        // Build search query for different providers
        if (this.provider === "google-drive") {
            params.query = `name contains '${query.replace(/'/g, "\\'")}' and trashed=false`;
        } else if (this.provider === "dropbox") {
            params.query = query;
        } else {
            params.query = query;
        }

        if (options?.pageToken) {
            params.pageToken = options.pageToken;
        }

        if (options?.pageSize) {
            params.pageSize = options.pageSize;
        }

        const result = await this.providerInstance.executeOperation(searchOp, params, connection, {
            mode: "workflow",
            workflowId: "integration-import",
            nodeId: "search"
        });

        if (!result.success) {
            throw new Error(result.error?.message || "Failed to search files");
        }

        return {
            files: this.normalizeFileList(result),
            nextPageToken: this.extractNextPageToken(result),
            breadcrumbs: []
        };
    }

    /**
     * Download file content
     */
    async download(
        connection: ConnectionWithData,
        fileId: string,
        mimeType: string
    ): Promise<IntegrationDownloadResult> {
        if (!this.capability.downloadOperation) {
            throw new Error(`Provider ${this.provider} does not support file download`);
        }

        // Handle Google Workspace documents (need export instead of download)
        if (
            this.provider === "google-drive" &&
            mimeType.startsWith("application/vnd.google-apps.")
        ) {
            return this.exportGoogleDocument(connection, fileId, mimeType);
        }

        const result = await this.providerInstance.executeOperation(
            this.capability.downloadOperation,
            { fileId },
            connection,
            { mode: "workflow", workflowId: "integration-import", nodeId: "download" }
        );

        if (!result.success) {
            throw new Error(result.error?.message || "Failed to download file");
        }

        const data = result.data as {
            content?: string;
            contentType?: string;
            filename?: string;
            size?: number;
        };

        // Convert base64 to buffer
        const buffer = Buffer.from(data.content || "", "base64");

        return {
            buffer,
            contentType: data.contentType || mimeType,
            filename: data.filename || `file_${fileId}`,
            size: buffer.length,
            fileId,
            modifiedTime: null,
            contentHash: this.computeHash(buffer)
        };
    }

    /**
     * Export Google Workspace document to PDF or other format
     */
    private async exportGoogleDocument(
        connection: ConnectionWithData,
        fileId: string,
        mimeType: string
    ): Promise<IntegrationDownloadResult> {
        // Determine export format
        const exportMimeType = this.getExportMimeType(mimeType);

        const result = await this.providerInstance.executeOperation(
            "exportDocument",
            { fileId, mimeType: exportMimeType },
            connection,
            { mode: "workflow", workflowId: "integration-import", nodeId: "export" }
        );

        if (!result.success) {
            throw new Error(result.error?.message || "Failed to export document");
        }

        const data = result.data as {
            content?: string;
            filename?: string;
        };

        const buffer = Buffer.from(data.content || "", "base64");

        return {
            buffer,
            contentType: exportMimeType,
            filename:
                data.filename ||
                `document_${fileId}.${this.getExtensionFromMimeType(exportMimeType)}`,
            size: buffer.length,
            fileId,
            modifiedTime: null,
            contentHash: this.computeHash(buffer)
        };
    }

    /**
     * Get the best export MIME type for a Google Workspace document
     */
    private getExportMimeType(googleMimeType: string): string {
        const exportMap: Record<string, string> = {
            "application/vnd.google-apps.document": "application/pdf",
            "application/vnd.google-apps.spreadsheet": "text/csv",
            "application/vnd.google-apps.presentation": "application/pdf",
            "application/vnd.google-apps.drawing": "application/pdf"
        };

        return exportMap[googleMimeType] || "application/pdf";
    }

    /**
     * Get file metadata
     */
    async getFileInfo(
        connection: ConnectionWithData,
        fileId: string
    ): Promise<IntegrationFile | null> {
        try {
            // Use getFile operation if available
            const getOp =
                this.capability.downloadOperation?.replace("download", "get") || "getFile";

            const result = await this.providerInstance.executeOperation(
                getOp,
                { fileId },
                connection,
                { mode: "workflow", workflowId: "integration-import", nodeId: "getFile" }
            );

            if (!result.success) {
                return null;
            }

            const file = result.data as Record<string, unknown>;
            return this.normalizeFile(file);
        } catch (error) {
            logger.debug({ fileId, err: error }, "Failed to get file info");
            return null;
        }
    }

    /**
     * Build breadcrumb trail
     */
    async buildBreadcrumbs(
        connection: ConnectionWithData,
        folderId: string
    ): Promise<Array<{ id: string; name: string }>> {
        const breadcrumbs: Array<{ id: string; name: string }> = [];

        if (this.provider !== "google-drive") {
            // Only Google Drive has easy parent traversal
            return breadcrumbs;
        }

        let currentId = folderId;
        const maxDepth = 10;
        let depth = 0;

        while (currentId && currentId !== "root" && depth < maxDepth) {
            depth++;

            try {
                const result = await this.providerInstance.executeOperation(
                    "getFile",
                    { fileId: currentId, fields: "id,name,parents" },
                    connection,
                    { mode: "workflow", workflowId: "integration-import", nodeId: "breadcrumb" }
                );

                if (!result.success) break;

                const file = result.data as { id: string; name: string; parents?: string[] };
                breadcrumbs.unshift({ id: file.id, name: file.name });

                currentId = file.parents?.[0] || "";
            } catch {
                break;
            }
        }

        // Add root
        breadcrumbs.unshift({ id: "root", name: "My Drive" });

        return breadcrumbs;
    }

    /**
     * Normalize file list from provider response
     */
    private normalizeFileList(result: OperationResult): IntegrationFile[] {
        const data = result.data as Record<string, unknown>;

        // Handle different response structures
        let items: unknown[] = [];

        if (Array.isArray(data)) {
            items = data;
        } else if (data.files) {
            items = data.files as unknown[];
        } else if (data.entries) {
            items = data.entries as unknown[];
        } else if (data.items) {
            items = data.items as unknown[];
        }

        return items.map((item) => this.normalizeFile(item as Record<string, unknown>));
    }

    /**
     * Normalize a single file from provider format
     */
    private normalizeFile(file: Record<string, unknown>): IntegrationFile {
        // Google Drive format
        if (this.provider === "google-drive") {
            const isFolder = file.mimeType === "application/vnd.google-apps.folder";
            const mimeType = file.mimeType as string;

            return {
                id: file.id as string,
                name: file.name as string,
                mimeType,
                size: file.size ? parseInt(file.size as string) : null,
                isFolder,
                modifiedTime: file.modifiedTime as string | null,
                path: null,
                downloadable: !isFolder && this.isImportableMimeType(mimeType),
                parentId: (file.parents as string[])?.[0] || null
            };
        }

        // Dropbox format
        if (this.provider === "dropbox") {
            const isFolder = file[".tag"] === "folder";

            return {
                id: (file.id as string) || (file.path_lower as string),
                name: file.name as string,
                mimeType: isFolder
                    ? "application/vnd.dropbox.folder"
                    : (file.content_type as string) || "application/octet-stream",
                size: file.size as number | null,
                isFolder,
                modifiedTime: file.server_modified as string | null,
                path: file.path_display as string | null,
                downloadable: !isFolder,
                parentId: null
            };
        }

        // Generic format
        const isFolder = file.isFolder || file.type === "folder" || file[".tag"] === "folder";
        const mimeType = (file.mimeType ||
            file.contentType ||
            file.type ||
            "application/octet-stream") as string;

        return {
            id: (file.id || file.path || file.key) as string,
            name: (file.name || file.title || file.filename) as string,
            mimeType,
            size: (file.size || file.fileSize) as number | null,
            isFolder: !!isFolder,
            modifiedTime: (file.modifiedTime || file.modified || file.updated_at) as string | null,
            path: (file.path || file.path_display) as string | null,
            downloadable: !isFolder && this.isImportableMimeType(mimeType),
            parentId: (file.parentId || file.parent_id || (file.parents as string[])?.[0]) as
                | string
                | null
        };
    }

    /**
     * Extract next page token from provider response
     */
    private extractNextPageToken(result: OperationResult): string | null {
        const data = result.data as Record<string, unknown>;

        return (data.nextPageToken || data.cursor || data.next_cursor || null) as string | null;
    }
}

/**
 * Create a binary file adapter for a provider
 */
export async function createBinaryFileAdapter(
    providerName: string,
    capability: DocumentCapability
): Promise<BinaryFileAdapter> {
    const provider = await providerRegistry.loadProvider(providerName);
    return new BinaryFileAdapter(provider, capability);
}
